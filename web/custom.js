/* custom.js */
import { HighlightEditor } from "../src/display/editor/highlight.js";
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
            .then(async res => {
              // Call the function to highlight the PDF with the received data
              // await highlightPDF(res);
              console.log("Success:", res);

              // Render all pages before highlighting
              await renderAllPages();

              // Highlight the first word on the first page
              await highlightTopPage();
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

// Function to render all pages
async function renderAllPages() {
  const pdfViewer = PDFViewerApplication.pdfViewer;
  const numPages = pdfViewer.pagesCount;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageView = pdfViewer.getPageView(pageNum - 1);

    // Check if the page is already rendered
    if (!pageView.renderingState || pageView.renderingState !== 3) {
      await pageView.draw();
    }
  }
}

// Function to highlight the first word of the first page
async function highlightTopPage() {
  const pdfViewer = PDFViewerApplication.pdfViewer;
  const pageView = pdfViewer.getPageView(0); // First page (index 0)

  // Ensure the page is rendered
  if (!pageView.renderingState || pageView.renderingState !== 3) {
    await pageView.draw();
  }

  const pdfPage = pageView.pdfPage;
  const textContent = await pdfPage.getTextContent();

  const items = textContent.items;

  if (items.length > 0) {
    const firstItem = items[0];
    const firstWord = firstItem.str.split(/\s+/)[0]; // Get the first word

    // Create a mock annotation for the first word
    const annotation = {
      text: firstWord,
      color: "yellow",
      comment: "First word of the document",
    };

    applyHighlight(pageView, annotation, textContent);
  } else {
    console.warn("No text items found on the first page.");
  }
}

async function highlightPDF(data) {
  // Access the PDF viewer and get the pages
  const pdfViewer = PDFViewerApplication.pdfViewer;
  const numPages = pdfViewer.pagesCount;
  console.log("Number of pages:", numPages);

  const pdfDocument = PDFViewerApplication.pdfDocument;
  const eventBus = PDFViewerApplication.eventBus;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageKey = "page" + pageNum;
    console.log("Processing", pageKey);
    if (data[pageKey]) {
      const annotations = data[pageKey];
      console.log("Annotations for page", pageNum, annotations);

      const pageView = pdfViewer.getPageView(pageNum - 1);

      try {
        const pdfPage = await pdfDocument.getPage(pageNum);
        const textContent = await pdfPage.getTextContent();

        // Ensure the text layer is rendered
        if (!pageView.textLayer || !pageView.textLayer.textDivs) {
          // Wait for text layer to render
          console.log(
            "Waiting for text layer to render for page",
            pageNum,
            textContent
          );

          await new Promise(resolve => {
            const textLayerRendered = function (event) {
              if (event.pageNumber === pageNum) {
                console.log("Text layer rendered for page", pageNum);
                resolve();
                eventBus.off("textlayerrendered", textLayerRendered);
              }
            };
            eventBus.on("textlayerrendered", textLayerRendered);
          });
        }

        annotations.forEach(annotation => {
          applyHighlight(pageView, annotation, textContent);
        });
      } catch (error) {
        console.error("Error processing page", pageNum, error);
      }
    } else {
      console.log("No annotations for page", pageNum);
    }
  }
}

function applyHighlight(pageView, annotation, textContent) {
  const { text, color, comment, line } = annotation;
  console.log("Applying highlight:", annotation);

  // Log the textLayer object
  console.log("pageView.textLayer:", pageView.textLayer);
  if (!pageView.textLayer) {
    console.warn("No textLayer for page", pageView.id);
    return;
  }

  const textDivs = pageView.textLayer.textDivs;
  if (!textDivs) {
    console.warn("No textDivs for page", pageView.id);
    return;
  }

  const items = textContent.items;

  // Build the concatenated text and map indices
  let pageText = "";
  const indexMap = []; // Map from pageText index to item index

  for (let i = 0; i < items.length; i++) {
    const itemText = items[i].str.replace(/\s+/g, ""); // Remove spaces in items
    for (let j = 0; j < itemText.length; j++) {
      pageText += itemText[j];
      indexMap.push(i);
    }
  }

  const searchText = text.replace(/\s+/g, "").toLowerCase();
  const pageTextNormalized = pageText.toLowerCase();

  const startIndex = pageTextNormalized.indexOf(searchText);

  if (startIndex === -1) {
    console.warn("Could not find text on page", pageView.id);
    return;
  }

  // Get the item indices that correspond to the matched text
  const matchedItemIndices = new Set();

  for (let idx = startIndex; idx < startIndex + searchText.length; idx++) {
    const itemIndex = indexMap[idx];
    matchedItemIndices.add(itemIndex);
  }

  // Now, get the bounding boxes of the textDivs at these indices
  const boxes = [];
  matchedItemIndices.forEach(function(i) {
    const textDiv = textDivs[i];
    if (textDiv) {
      const rect = textDiv.getBoundingClientRect();

      const viewport = pageView.viewport;

      // Convert the coordinates to PDF coordinates
      const [x1, y1] = viewport.convertToPdfPoint(rect.left, rect.top);
      const [x2, y2] = viewport.convertToPdfPoint(rect.right, rect.bottom);

      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);

      boxes.push({ x, y, width, height });
    }
  });

  if (boxes.length === 0) {
    console.warn("No boxes found for annotation on page", pageView.id);
    return;
  }

  // Now, create a HighlightEditor
  const editorParams = {
    color,
    opacity: 0.4, // Adjust opacity as needed
    boxes,
    text: text,
    methodOfCreation: "custom_script",
  };

  const highlightEditor = new HighlightEditor(editorParams);
  highlightEditor.pageIndex = pageView.id - 1;

  highlightEditor.parent = pageView.annotationEditorLayer;

  // Add the editor to the annotationEditorLayer
  pageView.annotationEditorLayer.add(highlightEditor);

  // If comment is provided, add a tooltip or popup
  if (comment) {
    // Set the title attribute on the highlight div for tooltip
    highlightEditor.div.title = comment;
  }
}
