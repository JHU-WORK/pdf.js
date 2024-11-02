/* custom.js */
import { PDFViewerApplication } from './viewer.js';

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
      alert("Checking lease status...");
      // Implement your custom logic here
    });
  }
});
