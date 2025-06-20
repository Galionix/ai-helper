import { el } from './el';

export function showToast(message: string) {
    let container = document.getElementById("custom-toast-container");
    if (!container) {
      container = el("div", {
        id: "custom-toast-container",
        style: {
          position: "fixed",
          top: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: "100000",
          maxWidth: "400px"
        }
      });
      document.body.appendChild(container);
    }

    const toast = el("div", {
      style: {
        background: "#333",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        position: "relative",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }
    });

    const closeBtn = el("button", {
      textContent: "×",
      style: {
        position: "absolute",
        top: "6px",
        right: "10px",
        background: "none",
        border: "none",
        color: "#fff",
        fontSize: "18px",
        cursor: "pointer"
      },
      listeners: {
        click: () => toast.remove()
      }
    });

    toast.textContent = message;
    toast.appendChild(closeBtn);
    container.appendChild(toast);
  }
