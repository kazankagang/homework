(function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    list: $("list"), empty: $("empty"), error: $("error"), count: $("count"),
    search: $("search"), subject: $("subject"), status: $("status"),
    title: $("title"), subtitle: $("subtitle"), updated: $("updated"),
  };
  let items = [];

  const MS_DAY = 86400000;
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmt = (d) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  function plural(n, a, b, c) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
    return c;
  }

  function deadlineInfo(deadline) {
    if (!deadline) return { cls: "none", text: "Без срока" };
    const diff = Math.round((deadline - today()) / MS_DAY);
    if (diff < 0) return { cls: "overdue", text: "Просрочено" };
    if (diff === 0) return { cls: "soon", text: "Сегодня" };
    if (diff === 1) return { cls: "soon", text: "Завтра" };
    const text = "Осталось " + diff + " " + plural(diff, "день", "дня", "дней");
    return { cls: diff <= 3 ? "soon" : "far", text };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    const q = els.search.value.trim().toLowerCase();
    const subj = els.subject.value;
    const st = els.status.value;
    const t = today();

    const shown = items
      .filter((a) => !subj || a.subject === subj)
      .filter((a) => {
        const over = !!a._deadline && a._deadline < t;
        return st === "all" || (st === "active" ? !over : over);
      })
      .filter((a) => !q || (a.title + " " + a.subject + " " + (a.description || "")).toLowerCase().includes(q))
      .sort((a, b) => {
        if (!a._deadline && !b._deadline) return 0;
        if (!a._deadline) return 1;
        if (!b._deadline) return -1;
        return st === "overdue" ? b._deadline - a._deadline : a._deadline - b._deadline;
      });

    els.list.replaceChildren();
    shown.forEach((a) => {
      const info = deadlineInfo(a._deadline);
      const card = el("article", "card " + info.cls);

      const top = el("div", "row");
      top.append(el("span", "subject", a.subject), el("span", "badge " + info.cls, info.text));

      card.append(top, el("h2", null, a.title));
      if (a.description) card.append(el("p", "desc", a.description));
      if (a.images && a.images.length) {
        const gal = el("div", "gallery");
        a.images.forEach((src) => {
          const link = el("a");
          link.href = src;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          const img = document.createElement("img");
          img.src = src;
          img.alt = "Фото задания: " + a.title;
          img.loading = "lazy";
          link.append(img);
          gal.append(link);
        });
        card.append(gal);
      }
      card.append(el("div", "meta",
        (a._deadline ? "Срок сдачи: " + fmt(a._deadline) + (a.time ? ", до " + a.time : "") : "Срок не указан") + (a.assigned ? " · " : "") + (a.assigned ? "Задано: " + fmt(parseDate(a.assigned)) : "")));

      if (a.links && a.links.length) {
        const box = el("div", "links");
        a.links.forEach((l) => {
          const link = el("a", null, l.title);
          link.href = l.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          box.append(link);
        });
        card.append(box);
      }
      els.list.append(card);
    });

    els.empty.hidden = shown.length > 0;
    els.count.textContent = shown.length
      ? "Найдено: " + shown.length + " " + plural(shown.length, "задание", "задания", "заданий")
      : "";
  }

  function init(data) {
    if (data.group) {
      els.title.textContent = "Домашние задания — " + data.group;
      document.title = "Домашние задания — " + data.group;
    }
    if (data.description) els.subtitle.textContent = data.description;
    if (data.updated) els.updated.textContent = fmt(parseDate(data.updated));

    items = (data.assignments || []).map((a) => Object.assign({}, a, { _deadline: a.deadline ? parseDate(a.deadline) : null }));

    [...new Set(items.map((a) => a.subject))].sort((a, b) => a.localeCompare(b, "ru")).forEach((s) => {
      const o = el("option", null, s);
      o.value = s;
      els.subject.append(o);
    });

    render();
  }

  [els.search, els.subject, els.status].forEach((e) => e.addEventListener("input", render));

  fetch("homework.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(init)
    .catch((err) => {
      els.error.hidden = false;
      els.error.textContent = "Не удалось загрузить homework.json (" + err.message + "). " +
        "Если открываете файл напрямую с диска — запустите локальный сервер: python -m http.server";
    });
})();
