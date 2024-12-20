/* custom.js */
import { PDFViewerApplication } from "./viewer.js";
// const pdfData = sessionStorage.getItem("uploadedPDF");

const pdfData = sessionStorage.getItem("uploadedPDF");

if (pdfData) {
  console.log("Opening PDF file from sessionStorage");
  const fileURL = pdfData; // Use the base64 data as the file URL
  PDFViewerApplication.open({ url: fileURL }); // Provide it as the `url` parameter
} else {
  console.log("No PDF file in sessionStorage");
  alert("No PDF file found. Please upload a file and try again.");
}

// window.openPDF = function () {
//   // Create a hidden file input element
//   const fileInput = document.createElement("input");
//   fileInput.type = "file";
//   fileInput.accept = "application/pdf";
//   fileInput.style.display = "none";

//   // Listen for file selection
//   fileInput.addEventListener("change", function (event) {
//     const file = event.target.files[0];
//     if (file) {
//       console.log("Opening PDF file:", file);
//       console.log("File name:", file.name);
//       const fileURL = URL.createObjectURL(file);
//       console.log("File URL:", fileURL);

//       // Close the current PDF before opening a new one
//       PDFViewerApplication.close().then(function () {
//         PDFViewerApplication.open({
//           url: fileURL,
//           originalUrl: file.name,
//         });
//       });
//     }
//   });

//   // Trigger the file dialog
//   document.body.append(fileInput);
//   fileInput.click();

//   // Clean up the file input element
//   fileInput.remove();

//   const response = await fetch('http://127.0.0.1:8000/api/summerize', {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(file)
//   });
// };

window.openPDF = async function () {
  // Create a hidden file input element
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/pdf";
  fileInput.style.display = "none";

  // Add to the DOM so that .click() works properly
  document.body.append(fileInput);

  // Create a Promise to wait for user selection
  const fileSelected = new Promise(resolve => {
    fileInput.addEventListener("change", () => resolve(fileInput.files[0]), {
      once: true,
    });
  });

  // Trigger the file dialog
  fileInput.click();

  // Wait for file to be selected
  const file = await fileSelected;

  // Remove the file input element from the DOM
  fileInput.remove();

  // If no file was selected, exit
  if (!file) {
    return;
  }

  console.log("Opening PDF file:", file);
  console.log("File name:", file.name);

  const fileURL = URL.createObjectURL(file);
  console.log("File URL:", fileURL);

  // Close the current PDF before opening a new one
  await PDFViewerApplication.close();
  PDFViewerApplication.open({
    url: fileURL,
    originalUrl: file.name,
  });

  // Read the file content as base64
  const fileBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = btoa(
        new Uint8Array(reader.result).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  // Store the uploaded PDF in session storage so that subsequent
  // page loads and requests use the newly uploaded PDF
  const base64Data = "data:application/pdf;base64," + fileBase64;
  sessionStorage.setItem("uploadedPDF", base64Data);

  // Send the PDF data to the server
  const response = await fetch("http://127.0.0.1:8000/api/summerize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_data: base64Data }),
  });

  if (!response.ok) {
    console.error("Error summarizing PDF:", response.status, response.statusText);
  } else {
    console.log("PDF summarized successfully");
  }
};

// TODO: check if the file is uploaded properly

window.highlightLease = function () {
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
          return response.blob(); // Get the response as a Blob
        })
        .then(async res => {
          // Create a URL for the Blob
          const fileURL = URL.createObjectURL(res);
          console.log("Received annotated PDF:", fileURL);

          // Close the current PDF before opening the new one
          await PDFViewerApplication.close();
          // Open the new annotated PDF
          await PDFViewerApplication.open({
            url: fileURL,
            originalUrl: "annotated_document.pdf",
          });
        })
        .catch(error => {
          console.error("Error:", error);
        });
    })
    .catch(function (error) {
      console.error("Error getting PDF data:", error);
    });
};

// window.onload = () => {
//   const fileInput = document.createElement("input");
//   fileInput.type = "file";
//   fileInput.accept = "application/pdf";
//   fileInput.style.display = "none";
//   const pdfData = sessionStorage.getItem("uploadedPDF");
//   const fileURL = URL.createObjectURL(pdfData);
//   PDFViewerApplication.close().then(function () {
//     PDFViewerApplication.open({
//       url: fileURL,
//       originalUrl: file.name,
//     });
//   });
//   // Trigger the file dialog
//   document.body.append(fileInput);
//   fileInput.click();

//   // Clean up the file input element
//   fileInput.remove();
// }
