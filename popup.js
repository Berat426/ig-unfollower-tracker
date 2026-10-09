/*
 * IG Unfollower Tracker
 * Copyright (C) 2026 Berat Ali Karadaş
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 * @author Berat Ali Karadaş
 */

const startBtn = document.getElementById('startBtn');
const statusBox = document.getElementById('status');
const progressBar = document.getElementById('progress');
const unfollowerList = document.getElementById('unfollowerList');


startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.style.opacity = '0.6';
  
  statusBox.innerText = 'Instagram sekmesi kontrol ediliyor...';
  progressBar.style.width = '15%';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    if (!activeTab || !activeTab.url || !activeTab.url.includes('instagram.com')) {
      statusBox.innerText = '⚠️ Lütfen tarayıcıda Instagram sekmesini açıp tekrar deneyin!';
      progressBar.style.width = '0%';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      return;
    }

    statusBox.innerText = 'Canlı veriler Instagram\'dan çekiliyor...';
    progressBar.style.width = '40%';

    chrome.tabs.sendMessage(activeTab.id, { action: 'VERI_CEK' }, (response) => {
      
      if (chrome.runtime.lastError || !response || response.status !== 'SUCCESS') {
        statusBox.innerText = '⚠️ Sayfa bağlanamadı. Instagram sayfasını yenileyip (F5) tekrar deneyin!';
        progressBar.style.width = '0%';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        return;
      }

      
      const rawTakipEdilenler = response.takipEdilenler || [];
      const rawTakipciler = response.takipciler || [];

      
      const guncelTakipcilerSet = new Set(rawTakipciler.map(u => u.toLowerCase().trim()));
      const guncelTakipEdilenlerSet = new Set(rawTakipEdilenler.map(u => u.toLowerCase().trim()));

      const guncelTakipciler = Array.from(guncelTakipcilerSet);
      const guncelTakipEdilenler = Array.from(guncelTakipEdilenlerSet);

      
      const geriTakipEtmeyenler = guncelTakipEdilenler.filter(
        (kullanici) => !guncelTakipcilerSet.has(kullanici)
      );

      statusBox.innerText = 'Geçmiş verilerle karşılaştırılıyor...';
      progressBar.style.width = '75%';

      
      chrome.storage.local.get(['kayitliTakipciler'], (result) => {
        const eskiTakipciler = (result.kayitliTakipciler || []).map(u => u.toLowerCase().trim());
        unfollowerList.innerHTML = '';

        const takibiBirakanlar = eskiTakipciler.length > 0 
          ? eskiTakipciler.filter((k) => !guncelTakipcilerSet.has(k)) 
          : [];

        statusBox.innerText = 'Analiz Tamamlandı!';

        
        const addListItem = (text, style = {}) => {
          const li = document.createElement('li');
          li.textContent = text;
          Object.assign(li.style, style);
          unfollowerList.appendChild(li);
        };

        
        if (eskiTakipciler.length === 0) {
          addListItem(
            `ℹ️ İlk tarama hafızaya alındı (${guncelTakipciler.length} takipçi). Takipten çıkanlar bir sonraki analizde kıyaslanacak.`,
            { color: '#38bdf8', fontWeight: 'bold' }
          );
        } else if (takibiBirakanlar.length > 0) {
          addListItem(
            `🚨 Takipten Çıkanlar (${takibiBirakanlar.length}):`,
            { color: '#ef4444', fontWeight: 'bold' }
          );
          takibiBirakanlar.forEach(k => {
            addListItem(`❌ @${k}`, { color: '#f87171' });
          });
        } else {
          addListItem(
            `✅ Son taramadan beri kimse seni takipten çıkmamış!`,
            { color: '#22c55e', fontWeight: 'bold' }
          );
        }

        
        addListItem(
          `⚠️ Seni Geri Takip Etmeyenler (${geriTakipEtmeyenler.length}):`,
          { color: '#eab308', fontWeight: 'bold', marginTop: '12px' }
        );
        geriTakipEtmeyenler.forEach(k => {
          addListItem(`@${k}`);
        });

        
        chrome.storage.local.set({ kayitliTakipciler: guncelTakipciler }, () => {
          progressBar.style.width = '100%';
          startBtn.disabled = false;
          startBtn.style.opacity = '1';
        });
      });
    });
  });
});