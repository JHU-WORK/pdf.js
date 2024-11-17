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
              // highlightPDF(res);
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

// // Define function to highlight PDF
// function highlightPDF(data) {
//   // Access the PDF viewer and get the pages
//   const pdfViewer = PDFViewerApplication.pdfViewer;
//   const numPages = pdfViewer.pagesCount;

//   // Go through each page and apply highlights based on data
//   for (let pageNum = 1; pageNum <= numPages; pageNum++) {
//     const pageKey = "page" + pageNum;
//     if (data[pageKey]) {
//       const annotations = data[pageKey];
//       annotations.forEach(annotation => {
//         const text = annotation.text;
//         const line = annotation.line;
//         const color = annotation.color;
//         const comment = annotation.comment;

//         // Implement the logic to find the text in the page and highlight it
//         // This involves working with the PDF.js TextLayer

//         // Get the page view
//         const pageView = pdfViewer.getPageView(pageNum - 1);

//         if (pageView.textLayer && pageView.textLayer.textDivs) {
//           // Text layer is already rendered
//           applyHighlight(pageView, text, color, comment);
//         } else {
//           // Wait for text layer to render
//           pageView.eventBus.on('textlayerrendered', function () {
//             applyHighlight(pageView, text, color, comment);
//           });
//         }
//       });
//     }
//   }
// }

// // Function to apply highlight to a pageView
// function applyHighlight(pageView, text, color, comment) {
//   const textDivs = pageView.textLayer.textDivs;
//   if (!textDivs) {
//     return;
//   }

//   textDivs.forEach((textDiv) => {
//     if (textDiv.textContent.includes(text)) {
//       // Apply highlight
//       textDiv.style.backgroundColor = color;
//       // Optionally, add tooltip or comment
//       if (comment) {
//         textDiv.title = comment;
//       }
//     }
//   });
// }
