/* =====================================================
   YARDIMCILAR
===================================================== */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function simulateClick(el) {
  if (!el) return;
  ["pointerdown", "mousedown", "mouseup", "click"].forEach(evt =>
    el.dispatchEvent(
      new MouseEvent(evt, { bubbles: true, cancelable: true, view: window })
    )
  );
}

/* =====================================================
   1️⃣ PAYLAŞIM KUTUSUNU AÇ
===================================================== */
async function openPostDialog() {
  const xpath = "//*[contains(text(),'Ne düşünüyorsun')]";

  for (let i = 0; i < 15; i++) {
    const el = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (el) {
      simulateClick(el);
      console.log("✅ Paylaşım kutusu açıldı");
      return true;
    }
    await wait(800);
  }

  console.warn("❌ Paylaşım kutusu açılamadı");
  return false;
}

/* =====================================================
   2️⃣ FOTOĞRAF / VİDEO → ÖNCE RESİM
===================================================== */
async function uploadImageFirst() {
  const imgObj = window.__EBS_FB_image;
  if (!imgObj) {
    console.warn("❌ window.__EBS_FB_image yok");
    return false;
  }

  const btn = document.querySelector(
    'div[aria-label="Fotoğraf/video"][role="button"]'
  );
  if (!btn) {
    console.warn("❌ Fotoğraf/Video butonu bulunamadı");
    return false;
  }

  simulateClick(btn);

  for (let i = 0; i < 20; i++) {
    const input = document.querySelector('input[type="file"]');
    if (input) {
      const arr = imgObj.dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8 = new Uint8Array(bstr.length);
      for (let j = 0; j < bstr.length; j++) {
        u8[j] = bstr.charCodeAt(j);
      }

      const file = new File([u8], imgObj.name, { type: mime });
      const dt = new DataTransfer();
      dt.items.add(file);

      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      console.log("📷 Resim yüklendi (ilk adım)");
      return true;
    }
    await wait(500);
  }

  console.warn("❌ Dosya input bulunamadı");
  return false;
}

/* =====================================================
   3️⃣ YAZIYI 2. (AKTİF) EDİTOR’A YAZ
===================================================== */
async function writeTextToActiveEditor() {
  const title = window.__EBS_FB_title || "";
  const href  = window.__EBS_FB_href  || "";

  const finalText =
`${title}

#beykozhaber #beykoz #haber

${href}`;

  for (let i = 0; i < 20; i++) {

    // 🔥 TÜM EDİTOR’LARI AL
    const editors = document.querySelectorAll(
      'div[contenteditable="true"][data-lexical-editor="true"]'
    );

    if (editors.length >= 2) {
      // 🔥 AKTİF OLAN = SONUNCU
      const editor = editors[editors.length - 1];

      editor.focus();
      editor.innerHTML = "";

      const p = document.createElement("p");
      p.textContent = finalText;
      editor.appendChild(p);

      editor.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: finalText
        })
      );

      console.log("📝 Yazı doğru (2.) editora yazıldı");
      return true;
    }

    await wait(800);
  }

  console.warn("❌ Aktif editor bulunamadı");
  return false;
}

/* =====================================================
   🚀 OTOMASYONU BAŞLAT
===================================================== */
(async () => {
  console.log("🚀 Facebook otomasyonu başladı");

  const opened = await openPostDialog();
  if (!opened) return;

  await wait(1000);

  // 🔥 ÖNCE RESİM
  const imgOk = await uploadImageFirst();
  if (!imgOk) return;

  await wait(1500);

  // 🔥 SONRA YAZI (2. editor)
  await writeTextToActiveEditor();

  console.log("✅ Facebook post TEK FORM olarak hazır");
})();
