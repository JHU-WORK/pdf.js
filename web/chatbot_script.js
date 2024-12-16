const pdfData = sessionStorage.getItem("uploadedPDF");
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");

let userMessage = null; // Variable to store user's message
const inputInitHeight = chatInput.scrollHeight;

// window.addEventListener('load', function () {
//   console.log("This will only run once.");
//   // 执行你想要的逻辑
// }, { once: true });

window.onload = async function () {
  pdf_file = {pdf_data: pdfData };
  const response = await fetch('http://127.0.0.1:8000/api/summerize', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(pdf_file)
  });
};

const createChatLi = (message, className) => {
  // Create a chat <li> element with passed message and className
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", `${className}`);
  let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
  chatLi.innerHTML = chatContent;
  chatLi.querySelector("p").textContent = message;
  return chatLi; // return chat <li> element
};

const generateResponse = async (chatElement, Messages) => {
  const messageElement = chatElement.querySelector("p");
  const data = { messages: Messages, pdf_data: pdfData };
  const response = await fetch('http://127.0.0.1:8000/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  const response_json = await response.json();

  messageElement.textContent = response_json.result;
  chatbox.scrollTo(0, chatbox.scrollHeight);
}

const handleChat = () => {
  userMessage = chatInput.value.trim(); // Get user entered message and remove extra whitespace
  if (!userMessage) return;

  // Clear the input textarea and set its height to default
  chatInput.value = "";
  chatInput.style.height = `${inputInitHeight}px`;

  // Append the user's message to the chatbox
  chatbox.appendChild(createChatLi(userMessage, "outgoing"));
  chatbox.scrollTo(0, chatbox.scrollHeight);

  chatMessages = document.querySelectorAll(".chatbox .chat p");
  messagesArray = Array.from(chatMessages).map((messageElement) => messageElement.textContent.trim());
  
  setTimeout(() => {
    // Display "Thinking..." message while waiting for the response
    const incomingChatLi = createChatLi("Thinking...", "incoming");
    chatbox.appendChild(incomingChatLi);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    generateResponse(incomingChatLi, messagesArray);
  }, 1000);
};

chatInput.addEventListener("input", () => {
  // Adjust the height of the input textarea based on its content
  chatInput.style.height = `${inputInitHeight}px`;
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
  // If Enter key is pressed without Shift key and the window
  // width is greater than 800px, handle the chat
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
    e.preventDefault();
    handleChat();
  }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));


// window.onload = () => {
//   const pdfData = sessionStorage.getItem("uploadedPDF");
  
//   if (pdfData) {
//     // Create a link to view/download the PDF
//     const link = document.createElement("a");
//     link.href = pdfData;
//     link.target = "_blank";
//     link.textContent = "View Uploaded PDF";
//     link.download = "uploaded.pdf";

//     const container = document.getElementById("pdfContainer");
//     container.innerHTML = ""; // Clear "Loading" text
//     container.appendChild(link);
//   } else {
//     alert("No PDF file found. Please upload it from Page One.");
//   }
// };

