function simulateRealClick(el) {
  if (!el) return;
  const events = ["pointerdown", "mousedown", "mouseup", "click"];
  for (const e of events) {
    const evt = new MouseEvent(e, { bubbles: true, cancelable: true, view: window });
    el.dispatchEvent(evt);
  }
  console.log("🖱️ simulateRealClick:", el);
}

async function uploadSelectedFileToInstagram() {
  const file = window.__EBS_imageFile; // background.js tarafından aktarılıyor
  if (!file) {
    console.warn("⚠️ Yüklenecek dosya bulunamadı (window.__EBS_imageFile yok).");
    return false;
  }

  // Instagram'daki input[type=file] alanını bul
  const input = document.querySelector('input[type="file"]');
  if (!input) {
    console.warn("⚠️ Dosya input'u bulunamadı!");
    return false;
  }

  // Dosyayı DataTransfer ile input’a bas
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  console.log("✅ Dosya input’a yüklendi:", file.name);

  // dosyanın yüklenmesini bekleyelim
 // await new Promise(r => setTimeout(r, 4000));
  return true;
}


async function bulVeTikla(xpath, label = "hedef", denemeSayisi = 5, beklemeMs = 800) {
  for (let i = 0; i < denemeSayisi; i++) {
    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (el) {
      simulateRealClick(el);
      console.log(`✅ ${label} (${xpath}) bulundu ve tıklandı.`);
      return true;
    }
    console.log(`⏳ ${label} (${xpath}) bulunamadı, tekrar deneme ${i + 1}/${denemeSayisi}...`);
    await new Promise(r => setTimeout(r, beklemeMs));
  }
  console.warn(`⚠️ ${label} (${xpath}) hiç bulunamadı.`);
  return false;
}


async function açıklamaYaz() {
  // 4️⃣ Açıklama textarea'sına yazı ekle
  await new Promise(r => setTimeout(r, 3000));
  const caption = window.__EBS_caption;
  const textarea = document.querySelector("textarea[aria-label='Bir açıklama yaz...']");
  if (textarea && caption) {
    textarea.value = caption;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("📝 Açıklama yazıldı:", caption);
    return true;
  } else {
    console.warn("⚠️ Açıklama textarea’sı bulunamadı.");
    return false;
  }
}

async function resmiOrtalaVeIleri() {
  console.log("🚀 resmiOrtalaVeIleri() başlatıldı...");

  const yuklendi = await uploadSelectedFileToInstagram();
  if (!yuklendi) {
    console.warn("⚠️ Resim yükleme başarısız, devam edilemiyor.");
    return;
  }

  await bulVeTikla("//*[@class='_abfb']", "Resim Ortala Butonu");
  //await new Promise(r => setTimeout(r, 1000));
  const ileriXpath = "//*[contains(@class,'_aa4m') and contains(@class,'_aa4p')]//button[contains(., 'İleri')]";
  await bulVeTikla(ileriXpath, "İleri Butonu");
  await açıklamaYaz();
  console.log("🏁 işlem tamamlandı: resim yüklendi, ortalandı ve ileri'ye basıldı.");
}

(async () => {
  console.log("🎬 instagram_clicker.js çalıştı — otomatik işlem başlatılıyor...");
  await resmiOrtalaVeIleri();
})();
