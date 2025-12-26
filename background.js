chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ EBS Instagram Aktarıcı yüklendi!");
});

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

chrome.action.onClicked.addListener(() => {
  mainFlow().catch(err => console.error("❌ mainFlow hatası:", err));
});

/* =====================================================
   HABER SAYFASINDAN GÖRSELİ AL → PNG'YE ÇEVİR
===================================================== */
async function fetchPostImageAsPNG(postUrl) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: postUrl, active: false }, (tab) => {
      const tabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId !== tabId) return;
        if (info.status !== "complete") return;

        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId },
          func: async () => {
            const imgNode = document.evaluate("//*[@class='post-image-inner']//img",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
            
            let imageUrl = null;
            imageUrl = imgNode.getAttribute("src");

            
            if (!imageUrl) return null;



            const res = await fetch(imageUrl);
            const blob = await res.blob();

            const pngBlob = await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";

              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0);
                canvas.toBlob(resolve, "image/png");
              };

              img.onerror = () => resolve(blob); // fallback
              img.src = URL.createObjectURL(blob);
            });

            const file = new File([pngBlob], "post.png", { type: "image/png" });

            return {
              name: file.name,
              type: file.type,
              dataUrl: await new Promise((r) => {
                const fr = new FileReader();
                fr.onload = () => r(fr.result);
                fr.readAsDataURL(file);
              })
            };
          }
        }, (res) => {
          chrome.tabs.remove(tabId);
          resolve(res?.[0]?.result || null);
        });
      });
    });
  });
}

/* =====================================================
   ANA AKIŞ
===================================================== */
async function mainFlow() {
  console.log("🚀 EBS Instagram Aktarıcı başladı...");

  const links = await getAllPostLinks();
  if (!links.length) {
    alert("⚠️ Hiç haber bulunamadı!");
    return;
  }

  console.log(`🔗 ${links.length} haber bulundu.`);

  const imageFiles = [];

  for (const link of links) {
    console.log("🖼️ Görsel alınıyor:", link.href);
    const img = await fetchPostImageAsPNG(link.href);
    if (img) imageFiles.push(img);
    await delay(500);
  }

  if (!imageFiles.length) {
    alert("❌ Hiçbir haberden görsel alınamadı!");
    return;
  }

  const processedPostsForX = [];

  /* ================= INSTAGRAM ================= */
  console.log("📱 Instagram paylaşımları başlıyor...");

  for (let i = 0; i < links.length; i++) {
    const { title, href } = links[i];
    const imageFile = imageFiles[i];
    if (!imageFile) continue;

    const caption =
      `#SonDakika ${title}\n\n` +
      `#beykozhaber #beykoz #haber\n\n` +
      `${href}`;

    await openInstagramAndPost(imageFile, caption);
    processedPostsForX.push({ title, href });

    await delay(2000);
  }

  console.log("✅ Instagram tamamlandı.");

  /* ================= FACEBOOK ================= */
  console.log("📘 Facebook paylaşımları başlıyor...");

  for (let i = 0; i < links.length; i++) {
    const { title, href } = links[i];
    const imageFile = imageFiles[i];
    if (!imageFile) continue;

    openFacebookAndPost(imageFile, title, href);
    await delay(2000);
  }

  console.log("✅ Facebook tamamlandı.");

  /* ================= X (TWITTER) ================= */
  console.log("🐦 X intent açılıyor...");
  await openXIntents(processedPostsForX);

  console.log("🎉 TÜM PAYLAŞIMLAR TAMAMLANDI!");
}

/* =====================================================
   HABER LİNKLERİNİ AL
===================================================== */
function getAllPostLinks() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab.url.includes("example.com.tr/admin/posts")) {
        alert("⚠️ Bu eklenti sadece admin/posts sayfasında çalışır.");
        resolve([]);
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return Array.from(document.querySelectorAll(".post-title a"))
            .map(a => ({
              title: a.innerText.trim(),
              href: new URL(a.href, location.origin).href
            }));
        }
      }, (res) => {
        resolve(res?.[0]?.result || []);
      });
    });
  });
}

/* =====================================================
   INSTAGRAM
===================================================== */
async function openInstagramAndPost(imageFile, captionText) {
  return new Promise((resolve) => {
    chrome.tabs.create(
      { url: "https://www.instagram.com/ebubekirbastama/", active: false },
      (tab) => {
        const tabId = tab.id;

        chrome.tabs.onUpdated.addListener(function listener(id, info) {
          if (id !== tabId) return;
          if (info.status !== "complete") return;

          chrome.tabs.onUpdated.removeListener(listener);

          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId },
              func: (fileObj, caption) => {
                const arr = fileObj.dataUrl.split(",");
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                const u8 = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);

                window.__EBS_imageFile = new File([u8], fileObj.name, { type: mime });
                window.__EBS_caption = caption;
              },
              args: [imageFile, captionText]
            }, () => {
              chrome.scripting.executeScript({
                target: { tabId },
                files: ["instagram_clicker.js"]
              }, () => resolve(true));
            });
          }, 4000);
        });
      }
    );
  });
}

/* =====================================================
   FACEBOOK
===================================================== */
function openFacebookAndPost(imageFile, title, href) {
  chrome.tabs.create(
    { url: "https://www.facebook.com/", active: false },
    (tab) => {
      const tabId = tab.id;

      chrome.tabs.onUpdated.addListener(function listener(id, info) {
        if (id !== tabId) return;
        if (info.status !== "complete") return;

        chrome.tabs.onUpdated.removeListener(listener);

        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            func: (img, t, h) => {
              window.__EBS_FB_image = img;
              window.__EBS_FB_title = t;
              window.__EBS_FB_href = h;
            },
            args: [imageFile, title, href]
          }, () => {
            chrome.scripting.executeScript({
              target: { tabId },
              files: ["facebook_clicker.js"]
            });
          });
        }, 3000);
      });
    }
  );
}

/* =====================================================
   X (TWITTER)
===================================================== */
async function openXIntents(posts) {
  for (const { title, href } of posts) {
    const text =
      `#SonDakika ${title}\n\n#ebubekir #ebubekirbastama`;

    const url =
      "https://x.com/intent/post" +
      "?url=" + encodeURIComponent(href) +
      "&text=" + encodeURIComponent(text);

    await chrome.tabs.create({ url, active: false });
    await delay(700);
  }
}
