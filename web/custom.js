/* custom.js */
import { PDFViewerApplication } from "./viewer.js";

PDFViewerApplication.initializedPromise.then(function () {
  // Get references to the buttons
  const openNewButton = document.getElementById("openNewButton");
  const checkLeaseButton = document.getElementById("checkLeaseButton");

  // "Open New" button logic
  if (openNewButton) {
    openNewButton.addEventListener("click", function () {
      // Create a hidden file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/pdf";
      fileInput.style.display = "none";

      // Listen for file selection
      fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
          const fileURL = URL.createObjectURL(file);

          // Close the current PDF before opening a new one
          PDFViewerApplication.close().then(function () {
            PDFViewerApplication.open({
              url: fileURL,
              originalUrl: file.name,
            });
          });
        }
      });

      // Trigger the file dialog
      document.body.append(fileInput);
      fileInput.click();

      // Clean up the file input element
      fileInput.remove();
    });
  }

  // "Check Lease" button logic
  if (checkLeaseButton) {
    checkLeaseButton.addEventListener("click", function () {
      console.log("Check Lease button clicked");

      // Get the pdfDocument from PDF.js
      const pdfDocument = PDFViewerApplication.pdfDocument;

      // Check if a PDF document is loaded
      if (!pdfDocument) {
        alert("Please open a PDF file first.");
        return;
      }

      // Get the PDF data as Uint8Array
      pdfDocument
        .getData()
        .then(function (data) {
          // Create a Blob from the data
          const blob = new Blob([data], { type: "application/pdf" });
          // Create a File object from the Blob
          const file = new File([blob], "document.pdf", {
            type: "application/pdf",
          });

          // Create a FormData object and append the PDF file
          const formData = new FormData();
          formData.append("file", file);

          // Send request to server
          fetch("http://127.0.0.1:8000/api/lease", {
            method: "POST",
            body: formData,
          })
            .then(response => {
              if (!response.ok) {
                throw new Error("Network response was not OK");
              }
              return response.json();
            })
            .then(res => {
              // Call the function to highlight the PDF with the received data
              highlightPDF(res);
              console.log("Success:", res);
            })
            .catch(error => {
              console.error("Error:", error);
            });
        })
        .catch(function (error) {
          console.error("Error getting PDF data:", error);
        });
    });
  }
});

function highlightPDF(data) {
  // Access the PDF viewer and get the pages
  const pdfViewer = PDFViewerApplication.pdfViewer;
  const numPages = pdfViewer.pagesCount;
  console.log("Number of pages:", numPages);

  // Go through each page and apply highlights based on data
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageKey = "page" + pageNum;
    console.log("Processing", pageKey);
    if (data[pageKey]) {
      const annotations = data[pageKey];
      console.log("Annotations for page", pageNum, annotations);
      const pageView = pdfViewer.getPageView(pageNum - 1);

      if (pageView.textLayer && pageView.textLayer.textDivs) {
        // Text layer is already rendered
        console.log("Text layer already rendered for page", pageNum);
        annotations.forEach(annotation => {
          applyHighlight(pageView, annotation);
        });
      } else {
        // Wait for text layer to render
        console.log("Waiting for text layer to render for page", pageNum);
        const eventBus = PDFViewerApplication.eventBus;
        const textLayerRendered = function (event) {
          if (event.pageNumber === pageNum) {
            console.log("Text layer rendered for page", pageNum);
            annotations.forEach(annotation => {
              applyHighlight(pageView, annotation);
            });
            // Remove the event listener after processing
            eventBus.off("textlayerrendered", textLayerRendered);
          }
        };
        eventBus.on("textlayerrendered", textLayerRendered);
      }
    } else {
      console.log("No annotations for page", pageNum);
    }
  }
}

function applyHighlight(pageView, annotation) {
  const { text, color, comment, line } = annotation;
  console.log("Applying highlight:", annotation);
  const textDivs = pageView.textLayer.textDivs;
  if (!textDivs) {
    console.warn("No textDivs for page", pageView.id);
    return;
  }

  // Normalize the search text
  const searchText = text.replace(/\s+/g, " ").trim().toLowerCase();
  console.log("Normalized search text:", searchText);

  let found = false;
  for (let i = 0; i < textDivs.length; i++) {
    let accumulatedText = "";
    const textDivIndices = [];
    for (let j = i; j < textDivs.length; j++) {
      const divText = textDivs[j].textContent.replace(/\s+/g, " ").trim();
      if (divText.length === 0) {
        continue; // skip empty textDivs
      }
      accumulatedText += (accumulatedText ? " " : "") + divText;
      textDivIndices.push(j);

      const accumulatedTextNormalized = accumulatedText.toLowerCase();
      // Log accumulated text
      console.log("Accumulated text:", accumulatedTextNormalized);

      if (accumulatedTextNormalized === searchText) {
        // Found exact match
        console.log("Found match at textDiv indices:", textDivIndices);
        for (const idx of textDivIndices) {
          textDivs[idx].style.backgroundColor = color;
          if (comment) {
            textDivs[idx].title = comment;
          }
        }
        found = true;
        return; // Found match, exit function
      } else if (accumulatedTextNormalized.length > searchText.length) {
        break; // Overshot, move to next starting textDiv
      }
    }
  }
  if (!found) {
    console.warn("Could not find text on page", pageView.id);
  }
}

// TODO: add logic for comments or tooltips to the highlighted text
