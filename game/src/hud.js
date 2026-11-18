// The HUD: health, cash, wanted stars, the clock, the mission card with
// its countdown and payout, speed, flash messages, banners and the menus.
// It is plain DOM over the canvas — big, high-contrast and readable when
// the screenshot is shrunk to a contact sheet.

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.healthFill = $('health-fill');
    this.healthText = $('health-text');
    this.cash = $('cash');
    this.stars = $('stars');
    this.clock = $('clock');
    this.ammo = $('ammo');
    this.objective = $('objective');
    this.objectiveText = $('objective-text');
    this.missionTimer = $('mission-timer');
    this.missionPayout = $('mission-payout');
    this.speed = $('speed');
    this.flashEl = $('flash');
    this.banner = $('banner');
    this.bannerTitle = $('banner-title');
    this.bannerSub = $('banner-sub');
    this.briefing = $('briefing');
    this.briefingTitle = $('briefing-title');
    this.briefingText = $('briefing-text');
    this.damage = $('damage');
    this.titleScreen = $('title-screen');
    this.pauseScreen = $('pause-screen');
    this.endScreen = $('end-screen');
    this.endTitle = $('end-title');
    this.endText = $('end-text');
    this.saveLine = $('save-line');
    this.flashTimer = null;
    this.bannerTimer = null;
    this.briefingTimer = null;
  }

  update(world) {
    const player = world.player;
    const pct = Math.max(0, Math.round((player.health / 100) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthFill.style.background = pct > 55 ? '#2ecc71' : pct > 25 ? '#f2c230' : '#e23a3a';
    this.healthText.textContent = `${pct} HP`;
    this.cash.textContent = `$${player.cash.toLocaleString('en-US')}`;
    this.ammo.textContent = player.inCar ? '—' : `AMMO ${player.ammo}`;

    let starsHtml = '';
    for (let i = 0; i < 5; i++) {
      starsHtml += `<span class="star${i < world.police.wanted ? ' on' : ''}">★</span>`;
    }
    this.stars.innerHTML = starsHtml;

    const h = Math.floor(world.daylight.hour);
    const m = Math.floor((world.daylight.hour - h) * 60);
    this.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const obj = world.missions.objective();
    if (obj) {
      this.objective.style.display = 'block';
      this.objectiveText.textContent = `${obj.title} — ${obj.text}`;
      if (obj.timer !== null && obj.timer !== undefined) {
        const t = Math.ceil(obj.timer);
        const mm = Math.floor(t / 60);
        const ss = String(t % 60).padStart(2, '0');
        this.missionTimer.textContent = `${mm}:${ss} · ${obj.distance}m to go`;
        this.missionTimer.style.color = t < 20 ? '#ff5a5a' : '#ffe9a8';
      } else {
        this.missionTimer.textContent = '';
      }
      this.missionPayout.textContent = obj.payout ? `Payout $${obj.payout.toLocaleString('en-US')}` : '';
    } else {
      this.objective.style.display = 'none';
    }

    this.speed.textContent = player.inCar
      ? `${Math.round(Math.abs(player.speed) * 3.6)} km/h`
      : 'ON FOOT';
  }

  flash(text, color = '#ffffff') {
    this.flashEl.textContent = text;
    this.flashEl.style.color = color;
    this.flashEl.style.opacity = '1';
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, 3200);
  }

  showBanner(title, sub = '') {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    this.banner.style.display = 'block';
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.style.display = 'none';
    }, 3600);
  }

  showBriefing(title, text) {
    this.briefingTitle.textContent = title;
    this.briefingText.textContent = text;
    this.briefing.style.display = 'block';
    if (this.briefingTimer) clearTimeout(this.briefingTimer);
    this.briefingTimer = setTimeout(() => {
      this.briefing.style.display = 'none';
    }, 9000);
  }

  hideBriefing() {
    this.briefing.style.display = 'none';
  }

  damageFlash() {
    this.damage.style.opacity = '1';
    setTimeout(() => {
      this.damage.style.opacity = '0';
    }, 220);
  }

  showScreen(name) {
    this.titleScreen.style.display = name === 'title' ? 'flex' : 'none';
    this.pauseScreen.style.display = name === 'pause' ? 'flex' : 'none';
    this.endScreen.style.display = name === 'end' ? 'flex' : 'none';
  }

  setSaveLine(text) {
    this.saveLine.textContent = text;
  }

  setEnd(title, text) {
    this.endTitle.textContent = title;
    this.endText.textContent = text;
  }
}
