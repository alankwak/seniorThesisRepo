const dropdown = document.getElementById("sidebarDropdown");
const output = document.getElementById("output");
const codeDisplay = document.getElementById("codeDisplay");

dropdown.addEventListener("change", (e) => {
  const val = e.target.value;
  output.textContent = val === "overview"
    ? "This is the Overview section."
    : "This is the Settings section.";
});

document.getElementById("create").addEventListener("click", async () => {
  try {
    const userId = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getUserId" }, resolve);
    });
    const res = await fetch("http://localhost:53140/api/session/create", { 
      method: "POST", 
      body: JSON.stringify({
        creator: userId
      }),
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    codeDisplay.textContent = `Session created with code: ${data.code}`; 
  } catch(err) {
    console.error("Error creating session:", err);
  }
});