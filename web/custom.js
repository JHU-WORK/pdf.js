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
              await highlightPDF(res);
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

async function highlightPDF(data) {
  // Access the PDF viewer and get the pages
  const pdfViewer = PDFViewerApplication.pdfViewer;
  const numPages = pdfViewer.pagesCount;
  console.log("Number of pages:", numPages);

  const eventBus = PDFViewerApplication.eventBus;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageKey = "page" + pageNum;
    console.log("Processing", pageKey);
    if (data[pageKey]) {
      const annotations = data[pageKey];
      console.log("Annotations for page", pageNum, annotations);

      const pageView = pdfViewer.getPageView(pageNum - 1);

      try {
        // Force the page to render
        await pageView.draw();

        // The text layer should now be available
        const textContent = await pageView.pdfPage.getTextContent();

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

  // Now, get the bounding boxes of the text items at these indices
  const boxes = [];
  matchedItemIndices.forEach(function(i) {
    const item = items[i];
    if (item) {
      const transform = item.transform;
      const fontHeight = Math.hypot(transform[2], transform[3]);
      const x = transform[4];
      const y = transform[5] - fontHeight;
      const width = item.width * transform[0]; // Adjusted for scaling
      const height = fontHeight;

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

  // Get the uiManager from PDF.js
  const uiManager = PDFViewerApplication.pdfViewer.annotationEditorUIManager;
  // Set parent to pageView
  const parent = pageView;

  const highlightEditor = new HighlightEditor(editorParams, parent, uiManager);

  // Add the editor to the annotationEditorLayer
  parent.annotationEditorLayer.add(highlightEditor);

  // If comment is provided, add a tooltip or popup
  if (comment) {
    // Set the title attribute on the highlight div for tooltip
    highlightEditor.div.title = comment;
  }
}
