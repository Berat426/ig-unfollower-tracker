/*
 * IG Unfollower Tracker
 * Copyright (C) 2026 Berat Ali Karadaş
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 * @author Berat Ali Karadaş
 */

console.log("IG Unfollower Tracker ajanı aktif!");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getUserIdFromCookie() {
  const match = document.cookie.match(/ds_user_id=([^;]+)/);
  return match ? match[1] : null;
}

async function fetchInstagramList(userId, endpointType) {
  const userSet = new Set();
  let maxId = null;
  let hasMore = true;
  let retryCount = 0;
  const appId = "936619743392459";

  while (hasMore) {
    let url = `https://www.instagram.com/api/v1/friendships/${userId}/${endpointType}/?count=50`;
    if (maxId) {
      url += `&max_id=${maxId}`;
    }

    try {
      const response = await fetch(url, {
        headers: { "x-ig-app-id": appId }
      });

      if (!response.ok) {
        console.warn(`[IG Tracker] Sunucu yanıt vermedi (${response.status}), 3 saniye bekleniyor...`);
        if (retryCount < 3) {
          retryCount++;
          await sleep(3000);
          continue;
        }
        break;
      }

      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("[IG Tracker] Instagram kısıtlamasına takılındı (HTML döndü). 4 saniye beklenip tekrar deneniyor...");
        if (retryCount < 3) {
          retryCount++;
          await sleep(4000); 
          continue;
        }
        break;
      }

      const data = await response.json();

      if (data.status === "fail") {
        console.warn("[IG Tracker] API kısıtlaması, 4 saniye bekleniyor...");
        if (retryCount < 3) {
          retryCount++;
          await sleep(4000);
          continue;
        }
        break;
      }

      
      retryCount = 0;

      if (data.users && Array.isArray(data.users)) {
        data.users.forEach(u => {
          if (u && u.username) {
            userSet.add(u.username.toLowerCase().trim());
          }
        });
      }

      maxId = data.next_max_id;
      hasMore = Boolean(maxId);

      if (hasMore) {
        
        const randomDelay = Math.floor(Math.random() * 2000) + 2000;
        await sleep(randomDelay);
      }

    } catch (err) {
      console.error("[IG Tracker] Veri çekme hatası:", err);
      if (retryCount < 3) {
        retryCount++;
        await sleep(3000);
      } else {
        break;
      }
    }
  }

  const uniqueList = Array.from(userSet);
  console.log(`[IG Tracker] ${endpointType} çekimi tamamlandı. Toplam: ${uniqueList.length}`);
  return uniqueList;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "VERI_CEK") {
    const userId = getUserIdFromCookie();

    if (!userId) {
      sendResponse({ status: "ERROR", message: "Instagram hesabına giriş yapılmamış!" });
      return true;
    }

    (async () => {
      try {
        console.log("[IG Tracker] 1. Aşama: Takipçi listesi çekiliyor...");
        const takipciler = await fetchInstagramList(userId, "followers");

        await sleep(1500);

        console.log("[IG Tracker] 2. Aşama: Takip edilenler listesi çekiliyor...");
        const takipEdilenler = await fetchInstagramList(userId, "following");

        sendResponse({
          status: "SUCCESS",
          takipciler: takipciler,
          takipEdilenler: takipEdilenler
        });
      } catch (err) {
        sendResponse({ status: "ERROR", message: err.toString() });
      }
    })();

    return true; 
  }
});