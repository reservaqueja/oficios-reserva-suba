(function () {
  const cfg = window.CONJUNTO_CONFIG || {};
  const fotos = [];
  const SESSION = "rs_oficios_ok";

  const TIPOS = [
    { id: "llamado", tag: "OF-01", titulo: "Llamado de atención escrito", desc: "Constancia. No es sanción.", plazoDefault: "No aplica — se deja constancia" },
    { id: "descargos", tag: "OF-02", titulo: "Requerimiento de descargos", desc: "8 días calendario.", plazoDefault: "Ocho (8) días calendario desde la notificación" },
    { id: "citacion", tag: "OF-03", titulo: "Citación a ser oído", desc: "RPH art. 99.", plazoDefault: "La fecha de citación de este oficio" },
    { id: "archivo", tag: "OF-04", titulo: "Comunicación de archivo", desc: "Sin mérito.", plazoDefault: "No aplica" },
    { id: "sancion", tag: "OF-05", titulo: "Comunicación de sanción del Consejo", desc: "Solo si ya hay acta.", plazoDefault: "Tres (3) días hábiles para reposición" }
  ];

  const $ = (id) => document.getElementById(id);

  function unlocked() {
    return sessionStorage.getItem(SESSION) === "1";
  }

  function showApp(on) {
    $("gate").hidden = on;
    $("app").hidden = !on;
  }

  function applyConfig() {
    if ($("footerName")) $("footerName").textContent = cfg.nombre || "Reserva de Suba";
    const q = $("btnQuejas");
    if (q) q.href = cfg.urlQuejas || "#";
    const f = document.querySelector('input[name="fecha_oficio"]');
    if (f && !f.value) f.value = new Date().toISOString().slice(0, 10);
  }

  function renderTipos() {
    $("tipoGrid").innerHTML = TIPOS.map((t) => `
      <button type="button" class="type-card" data-id="${t.id}">
        <span class="type-tag">${t.tag}</span>
        <h3>${t.titulo}</h3>
        <p>${t.desc}</p>
      </button>`).join("");
  }

  function selectTipo(id) {
    const t = TIPOS.find((x) => x.id === id);
    if (!t) return;
    $("tipoOficio").value = t.id;
    $("tipoLabel").value = t.titulo;
    document.querySelectorAll("#tipoGrid .type-card").forEach((b) => {
      b.classList.toggle("active", b.dataset.id === id);
    });
    $("bloqueSancion").hidden = id !== "sancion";
    $("bloqueCitacion").hidden = id !== "citacion";
    const actaN = document.querySelector('input[name="acta_numero"]');
    const actaF = document.querySelector('input[name="acta_fecha"]');
    const dec = document.querySelector('select[name="decision"]');
    if (actaN) actaN.required = id === "sancion";
    if (actaF) actaF.required = id === "sancion";
    if (dec) dec.required = id === "sancion";
    const plazo = document.querySelector('input[name="plazo"]');
    if (plazo && (!plazo.value || TIPOS.some((x) => x.plazoDefault === plazo.value))) {
      plazo.value = t.plazoDefault;
    }
    const pedido = document.querySelector('select[name="pedido"]');
    if (pedido && id === "sancion") pedido.value = "Comunicar la sanción ya decidida por el Consejo y facturarla";
  }

  function fd() {
    return Object.fromEntries(new FormData($("oficioForm")).entries());
  }

  function oficioId() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return "REQ-" + y + m + day + "-" + String(d.getTime()).slice(-6);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtFecha(iso) {
    if (!iso) return "—";
    const p = String(iso).split("-");
    if (p.length !== 3) return iso;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
      .toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }

  function fotosHTML() {
    if (!fotos.length) {
      return "<p>No se insertaron fotografías. Si existen, se anexan en físico o por correo citando este oficio.</p>";
    }
    return `<div class="pruebas-doc count-${fotos.length}">${fotos.map((f, i) =>
      `<img src="${f.src}" alt="Prueba ${i + 1}" />`).join("")}</div>`;
  }

  function parrafosSegunTipo(data, num) {
    const tipo = data.tipo_oficio;
    if (tipo === "llamado") {
      return `<p>Se formula <strong>llamado de atención</strong> (Manual art. 133). Queda en la carpeta de la unidad. <strong>No constituye sanción.</strong></p>
      <p>Se solicita enmendar la conducta. La reincidencia podrá dar lugar a descargos y, si hay mérito, a decisión del Consejo.</p>`;
    }
    if (tipo === "descargos") {
      return `<p>Hay mérito para continuar. Se formula <strong>requerimiento escrito</strong> para que, en <strong>ocho (8) días calendario</strong>, presente descargos y pruebas (Ley 675 art. 60; Manual art. 133 num. 3).</p>
      <p>Responda a ${escapeHtml(cfg.emailAdmin || "")} o en la oficina, citando el oficio <strong>${num}</strong> y el radicado ${escapeHtml(data.radicado_queja || "")}.</p>
      <p>Vencido el plazo, el <strong>Consejo de Administración</strong> podrá decidir. El administrador no impone la sanción (escritura 176, arts. 98 y 100).</p>`;
    }
    if (tipo === "citacion") {
      return `<p>Conforme al artículo 99 del reglamento, se le cita para ser oído:</p>
      <p><strong>${escapeHtml(data.citacion || "Fecha, hora y lugar que constarán en la notificación")}</strong></p>
      <p>Si no puede asistir, indíquelo por escrito. La inasistencia no impide que el Consejo resuelva con el expediente.</p>`;
    }
    if (tipo === "sancion") {
      return `<p><strong>Esta sanción la impuso el Consejo. La administración solo la factura.</strong></p>
      <p>Según el acta <strong>${escapeHtml(data.acta_numero || "—")}</strong> del <strong>${fmtFecha(data.acta_fecha)}</strong>, el Consejo de Administración decidió:</p>
      <p>${escapeHtml(data.decision || "—")}${data.cuotas_multa ? " · " + escapeHtml(data.cuotas_multa) + " cuota(s)" : ""}${data.valor_multa ? " · Valor: " + escapeHtml(data.valor_multa) : ""}.</p>
      <p>La administración incluirá el valor, si lo hay, en el recibo de la unidad. Contra esta decisión procede <strong>reposición ante el Consejo en tres (3) días hábiles</strong> (resuelve en ocho) e <strong>impugnación judicial dentro del mes</strong> siguiente a esta comunicación (RPH art. 101).</p>`;
    }
    return `<p>Revisado el radicado ${escapeHtml(data.radicado_queja || "")}, se <strong>archiva</strong> por no hallar mérito. Hechos distintos o posteriores podrán abrir un trámite nuevo, con el mismo debido proceso.</p>`;
  }

  function buildDocumento(data, num) {
    const destinatario = data.nombre_destinatario
      ? `${escapeHtml(data.nombre_destinatario)} · Unidad ${escapeHtml(data.unidad)}`
      : `Residente / propietario de la unidad ${escapeHtml(data.unidad)}`;
    const reserva = data.reserva_quejoso
      ? "El presentante solicitó reserva de identidad. Este oficio no revela su nombre."
      : "La identidad del presentante, si consta, solo se usa en el expediente interno.";
    const norma = [data.norma, data.norma_detalle].filter(Boolean).join(" — ");

    return `
      <p class="sub">${escapeHtml(cfg.nombre || "Reserva de Suba")}<br>
      ${escapeHtml(cfg.direccion || "")} · ${escapeHtml(cfg.ciudad || "")}<br>
      Oficio <strong>${num}</strong> · Queja origen ${escapeHtml(data.radicado_queja || "—")}</p>
      <h1>${escapeHtml(data.tipo_label || "Oficio")}</h1>
      <p>Bogotá D.C., ${fmtFecha(data.fecha_oficio)}</p>
      <p>Señores<br><strong>${destinatario}</strong><br>${escapeHtml(data.calidad || "")}<br>
      Parque Residencial Reserva de Suba P.H.</p>
      <p><strong>Asunto:</strong> ${escapeHtml(data.tipo_label || "Oficio")} — unidad ${escapeHtml(data.unidad)} — radicado ${escapeHtml(data.radicado_queja || "—")}.</p>
      ${data.tipo_oficio === "sancion"
        ? "<p>Se comunica una decisión <strong>ya adoptada por el Consejo de Administración</strong>.</p>"
        : "<p><strong>Este escrito no impone sanción, multa ni restricción de zonas comunes.</strong></p>"}
      <h3>I. Identificación</h3>
      <table>
        <tr><th>Oficio</th><td>${num}</td></tr>
        <tr><th>Queja de origen</th><td>${escapeHtml(data.radicado_queja || "—")}</td></tr>
        <tr><th>Tipo</th><td>${escapeHtml(data.tipo_label || "—")}</td></tr>
        <tr><th>Unidad</th><td>${escapeHtml(data.unidad)}</td></tr>
        <tr><th>Destinatario</th><td>${escapeHtml(data.nombre_destinatario || "Quien resida o sea propietario")}</td></tr>
        <tr><th>Fecha de los hechos</th><td>${fmtFecha(data.fecha_hechos)}</td></tr>
        <tr><th>Plazo</th><td>${escapeHtml(data.plazo || "—")}</td></tr>
        ${data.tipo_oficio === "sancion" ? `<tr><th>Acta del Consejo</th><td>${escapeHtml(data.acta_numero || "—")} · ${fmtFecha(data.acta_fecha)}</td></tr>` : ""}
      </table>
      <h3>II. Hechos</h3>
      <p>${escapeHtml(data.hechos || "").replace(/\n/g, "<br>")}</p>
      <h3>III. Norma</h3>
      <p>${escapeHtml(norma || "—")}</p>
      <h3>IV. Pruebas</h3>
      <p>${escapeHtml(data.pruebas || "Las que obran en el expediente y las que se anexan.")}</p>
      ${fotosHTML()}
      <h3>V. Lo que se comunica</h3>
      ${parrafosSegunTipo(data, num)}
      <p><strong>Lo que se pide:</strong> ${escapeHtml(data.pedido || "—")}</p>
      <p><strong>Medio de respuesta:</strong> ${escapeHtml(data.medio_respuesta || cfg.emailAdmin || "")}</p>
      <h3>VI. Reserva y datos</h3>
      <p>${reserva} Uso exclusivo de este trámite (Ley 1581 de 2012).</p>
      <div class="firma">
        <div><div class="linea">Quien suscribe<br>${escapeHtml(data.firmante)}<br>${escapeHtml(data.cargo)}</div></div>
        <div><div class="linea">Recibido por el destinatario<br>Nombre, documento, fecha y firma</div></div>
      </div>
    `;
  }

  function textoPlano(data, num) {
    const div = document.createElement("div");
    div.innerHTML = buildDocumento(data, num);
    return div.innerText.replace(/\n{3,}/g, "\n\n");
  }

  function downloadWord(data, num) {
    const inner = buildDocumento(data, num);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${num}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; }
        h1 { font-size: 16pt; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; }
        th { width: 34%; background: #f4f4f4; text-align: left; }
        .pruebas-doc { width: 100%; }
        .pruebas-doc img { width: 48%; height: 180px; object-fit: cover; margin: 4px 1%; }
        .sub { font-size: 9pt; color: #555; }
      </style></head><body>${inner}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = num + " — " + (data.unidad || "oficio") + ".doc";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function mailto(to, subject, body) {
    return "mailto:" + encodeURIComponent(to || "") +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body.slice(0, 1800));
  }

  function openModal(data, num) {
    $("documento").innerHTML = buildDocumento(data, num);
    $("modalTitle").textContent = (data.tipo_label || "Oficio") + " · " + num;
    $("modal").hidden = false;
    $("modal").dataset.payload = JSON.stringify({ data, num });
    const asunto = (cfg.asuntoCorreo || "Oficio Reserva de Suba") + " " + num + " — " + (data.unidad || "");
    const btnI = $("mailInfractorBtn");
    if (data.email_destinatario) {
      btnI.href = mailto(data.email_destinatario, asunto, textoPlano(data, num));
      btnI.style.display = "";
    } else {
      btnI.removeAttribute("href");
      btnI.style.display = "none";
    }
  }

  function readFotos(files) {
    Array.from(files || []).slice(0, 4 - fotos.length).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => { fotos.push({ name: file.name, src: reader.result }); renderFotos(); };
      reader.readAsDataURL(file);
    });
  }

  function renderFotos() {
    $("fotosGrid").innerHTML = fotos.map((f, i) => `
      <div class="foto-item">
        <img src="${f.src}" alt="" />
        <button type="button" data-del="${i}">Quitar</button>
      </div>`).join("");
  }

  $("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = ($("loginUser").value || "").trim();
    const p = $("loginPass").value || "";
    const okUser = u.toLowerCase() === String(cfg.accesoUsuario || "administracion").toLowerCase();
    const okPass = p === String(cfg.accesoClave || "");
    if (okUser && okPass) {
      sessionStorage.setItem(SESSION, "1");
      $("loginError").textContent = "";
      showApp(true);
    } else {
      $("loginError").textContent = "Usuario o clave incorrectos.";
    }
  });

  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION);
    showApp(false);
  });

  $("tipoGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".type-card");
    if (b) selectTipo(b.dataset.id);
  });

  $("fotos").addEventListener("change", (e) => {
    readFotos(e.target.files);
    e.target.value = "";
  });

  $("fotosGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (!b) return;
    fotos.splice(Number(b.dataset.del), 1);
    renderFotos();
  });

  $("oficioForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!$("tipoOficio").value) {
      alert("Elija el tipo de oficio.");
      return;
    }
    if ($("tipoOficio").value === "sancion") {
      const d = fd();
      if (!d.acta_numero || !d.acta_fecha || !d.decision) {
        alert("OF-05 exige número y fecha del acta y la decisión del Consejo.");
        return;
      }
    }
    if (!$("oficioForm").reportValidity()) return;
    openModal(fd(), oficioId());
  });

  $("oficioForm").addEventListener("reset", () => {
    fotos.length = 0;
    renderFotos();
    $("tipoOficio").value = "";
    $("tipoLabel").value = "";
    $("bloqueSancion").hidden = true;
    $("bloqueCitacion").hidden = true;
    document.querySelectorAll("#tipoGrid .type-card").forEach((b) => b.classList.remove("active"));
  });

  $("modal").addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) $("modal").hidden = true;
  });

  $("wordBtn").addEventListener("click", () => {
    const raw = $("modal").dataset.payload;
    if (!raw) return;
    const { data, num } = JSON.parse(raw);
    downloadWord(data, num);
  });

  applyConfig();
  renderTipos();
  showApp(unlocked());
})();
