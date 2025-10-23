const dropdown = document.getElementById("sidebarDropdown");
const output = document.getElementById("output");

dropdown.addEventListener("change", (e) => {
  const val = e.target.value;
  output.textContent = val === "overview"
    ? "This is the Overview section."
    : "This is the Settings section.";
});