import { loadGameData } from "./data-loader.js";
import { createUI } from "./ui.js";

async function main() {
  try {
    const data = await loadGameData();
    createUI(data).init();
  } catch (error) {
    console.error(error);
    const target = document.getElementById("formulaDebug");
    if (target) {
      target.textContent = `資料載入失敗：${error.message}`;
    }
  }
}

main();
