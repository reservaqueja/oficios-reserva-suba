(function () {
  const cfg = window.CONJUNTO_CONFIG || {};
  const fotos = [];
  const SESSION = "rs_oficios_ok";

  const TEMAS = {
    ruido: "Manual de Convivencia 2020 — ruido. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    mascotas: "Manual de Convivencia 2020 — mascotas. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    parqueadero: "Manual de Convivencia 2020 — parqueadero / visitantes. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    balcones: "Manual de Convivencia 2020 — balcones, ventanas y fachada. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    zonas: "Manual de Convivencia 2020 — zonas comunes. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    aseo: "Manual de Convivencia 2020 — aseo y basuras. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    obras: "Manual de Convivencia 2020 — obras y modificaciones. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    convivencia: "Manual de Convivencia 2020 — convivencia / irrespeto. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    seguridad: "Manual de Convivencia 2020 — seguridad y acceso. Trámite: Manual art. 133 y Ley 675 arts. 59 y 60.",
    otro: "Norma del Manual de Convivencia 2020 o del reglamento (escritura 176 de 2016). Trámite: art. 133 y Ley 675 arts. 59 y 60."
  };

  const TIPOS = [
    { id: "llamado", tag: "OF-01", titulo: "Llamado de atención escrito", desc: "Constancia. No es sanción.", plazoDefault: "No aplica — se deja constancia" },
    { id: "descargos", tag: "OF-02", titulo: "Requerimiento de descargos", desc: "8 días calendario.", plazoDefault: "Ocho (8) días calendario desde la notificación" },
    { id: "citacion", tag: "OF-03", titulo: "Citación a ser oído", desc: "RPH art. 99.", plazoDefault: "La fecha de citación de este oficio" },
    { id: "archivo", tag: "OF-04", titulo: "Comunicación de archivo", desc: "Sin mérito.", plazoDefault: "No aplica" },
    { id: "sancion", tag: "OF-05", titulo: "Comunicación de sanción del Consejo", desc: "Solo si ya hay acta.", plazoDefault: "Tres (3) días hábiles para reposición" }
  ];

  /* Tamaño fijo de cada foto dentro del Word (proporción 3:2).
     Al recortar y redimensionar aquí mismo, cada imagen queda ya
     con el tamaño exacto en píxeles, así Word la muestra igual
     sin importar la resolución original de la foto (Word ignora
     "object-fit" y otras propiedades CSS modernas). */
  const FOTO_ANCHO_PX = 298; // ≈ 3.1 in a 96 dpi
  const FOTO_ALTO_PX = 199;  // ≈ 2.07 in a 96 dpi

  function recortarImagen(file, anchoDestino, altoDestino, calidad) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = anchoDestino;
          canvas.height = altoDestino;
          const ctx = canvas.getContext("2d");
          const relOrigen = img.width / img.height;
          const relDestino = anchoDestino / altoDestino;
          let sx, sy, sw, sh;
          if (relOrigen > relDestino) {
            sh = img.height;
            sw = sh * relDestino;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = sw / relDestino;
            sx = 0;
            sy = (img.height - sh) / 2;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, anchoDestino, altoDestino);
          const escala = Math.min(anchoDestino / img.width, altoDestino / img.height);
          const dw = img.width * escala;
          const dh = img.height * escala;
          const dx = (anchoDestino - dw) / 2;
          const dy = (altoDestino - dh) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", calidad || 0.85));
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

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
    const fc = $("footerContacto");
    if (fc) {
      const partes = [
        cfg.telefonoAdmin ? "Tel. administración: " + cfg.telefonoAdmin : "",
        cfg.emailAdmin || "",
        cfg.horarioAtencion || ""
      ].filter(Boolean);
      fc.textContent = partes.join(" · ");
    }
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
    let filas = "";
    for (let i = 0; i < 4; i += 2) {
      const a = fotos[i];
      const b = fotos[i + 1];
      if (!a && !b) break;
      filas += "<tr>";
      filas += a
        ? `<td class="foto-celda"><img src="${a.src}" width="${FOTO_ANCHO_PX}" height="${FOTO_ALTO_PX}" alt="Prueba ${i + 1}" /><p class="foto-pie">Prueba ${i + 1}</p></td>`
        : `<td class="foto-celda">&nbsp;</td>`;
      filas += b
        ? `<td class="foto-celda"><img src="${b.src}" width="${FOTO_ANCHO_PX}" height="${FOTO_ALTO_PX}" alt="Prueba ${i + 2}" /><p class="foto-pie">Prueba ${i + 2}</p></td>`
        : `<td class="foto-celda">&nbsp;</td>`;
      filas += "</tr>";
    }
    return `<p class="foto-titulo">Registro fotográfico (anexo)</p><table class="fotos-pagina"><tbody>${filas}</tbody></table>`;
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
    const cita = TEMAS[data.norma] || data.norma || "—";
    const norma = [cita, data.norma_detalle].filter(Boolean).join(" — ");

    const contacto = [
      cfg.telefonoAdmin ? "Tel. " + escapeHtml(cfg.telefonoAdmin) : "",
      escapeHtml(cfg.emailAdmin || "")
    ].filter(Boolean).join(" · ");

    return `
      <p class="sub">${escapeHtml(cfg.nombre || "Reserva de Suba")} · ${escapeHtml(cfg.direccion || "")}<br>
      Administración: Tel. ${escapeHtml(cfg.telefonoAdmin || "3194090958")} · ${escapeHtml(cfg.emailAdmin || "")}<br>
      Oficio <strong>${num}</strong> · Queja ${escapeHtml(data.radicado_queja || "—")} · Unidad ${escapeHtml(data.unidad)}${data.tipo_oficio === "sancion" ? " · Acta " + escapeHtml(data.acta_numero || "—") + " del " + fmtFecha(data.acta_fecha) : ""}</p>
      <h1>${escapeHtml(data.tipo_label || "Oficio")}</h1>
      <p>Bogotá D.C., ${fmtFecha(data.fecha_oficio)}</p>
      <p>Señor(es) <strong>${destinatario}</strong>${data.calidad ? " (" + escapeHtml(data.calidad) + ")" : ""}.</p>
      <p><strong>Asunto:</strong> ${escapeHtml(data.tipo_label || "Oficio")} — unidad ${escapeHtml(data.unidad)}.</p>
      ${data.tipo_oficio === "sancion"
        ? "<p>Se comunica una decisión <strong>ya adoptada por el Consejo de Administración</strong>.</p>"
        : "<p><strong>Este escrito no impone sanción ni multa.</strong></p>"}
      <h3>Hechos</h3>
      <p>${escapeHtml(data.hechos || "").replace(/\n/g, "<br>")}${data.fecha_hechos ? " (Fecha de los hechos: " + fmtFecha(data.fecha_hechos) + ".)" : ""}</p>
      <h3>Norma</h3>
      <p>${escapeHtml(norma || "—")}</p>
      <h3>Pruebas</h3>
      <p>${escapeHtml(data.pruebas || "Las que obran en el expediente y las que se anexan.")}</p>
      ${fotosHTML()}
      <h3>Lo que se comunica</h3>
      ${parrafosSegunTipo(data, num)}
      <p><strong>Se pide:</strong> ${escapeHtml(data.pedido || "—")} · <strong>Plazo:</strong> ${escapeHtml(data.plazo || "—")}</p>
      <p><strong>Respuesta:</strong> ${escapeHtml(data.medio_respuesta || contacto || "")}</p>
      <p class="sub">${reserva}</p>
      <table class="firma"><tbody><tr>
        <td><div class="linea">Quien suscribe<br>${escapeHtml(data.firmante)}<br>${escapeHtml(data.cargo)}</div></td>
        <td><div class="linea">Recibido<br>Nombre, documento, fecha y firma</div></td>
      </tr></tbody></table>
    `;
  }

  function downloadWord(data, num) {
    const inner = buildDocumento(data, num);
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${num}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11.5pt; color: #111827; line-height: 1.42; margin: 0; text-align: justify; }
  h1 { font-size: 15pt; margin: 10pt 0 10pt; text-align: left; }
  h3 { font-size: 12pt; margin: 16pt 0 6pt; border-top: 1px solid #cbd5e1; padding-top: 8pt; text-align: left; }
  p { margin: 0 0 8pt; }
  strong { color: #111827; }
  table { border-collapse: collapse; width: 100%; margin: 4pt 0 12pt; }
  th, td { border: 1px solid #c7ccd4; padding: 6pt 8pt; font-size: 10.5pt; text-align: left; vertical-align: top; }
  th { width: 34%; background: #f4f4f5; font-weight: 700; }
  .sub { font-size: 9pt; color: #555; margin: 0 0 12pt; text-align: left; line-height: 1.5; }
  .foto-titulo { font-size: 10.5pt; font-weight: 700; margin: 4pt 0 4pt; text-align: left; }
  .fotos-pagina { width: 100%; border-collapse: collapse; page-break-inside: avoid; margin: 0 0 12pt; }
  .fotos-pagina td.foto-celda { width: 50%; padding: 6pt; text-align: center; vertical-align: top; }
  .fotos-pagina img { display: block; margin: 0 auto 4pt; border: 1px solid #cbd5e1; }
  .foto-pie { margin: 0; font-size: 9pt; color: #555; text-align: center; }
  table.firma { border: none; margin-top: 30pt; page-break-inside: avoid; }
  table.firma td { border: none; padding: 0 14pt 0 0; width: 50%; vertical-align: top; text-align: left; }
  table.firma .linea { border-top: 1px solid #111827; padding-top: 6pt; font-size: 10pt; }
</style>
</head>
<body>
<div class="WordSection1">${inner}</div>
</body>
</html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = num + " — " + (data.unidad || "oficio") + ".doc";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function hojaEstilos() {
    return `@page { size: letter; margin: 0.6in; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.35; }
      h1 { font-size: 14pt; margin: 6pt 0 8pt; }
      h3 { font-size: 11pt; margin: 10pt 0 4pt; border-top: 1px solid #ccc; padding-top: 6pt; }
      p { margin: 0 0 6pt; }
      .sub { font-size: 9pt; color: #444; margin: 0 0 8pt; line-height: 1.4; }
      .fotos-pagina { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
      .fotos-pagina td.foto-celda { width: 50%; padding: 4pt; text-align: center; vertical-align: top; }
      .fotos-pagina img { display: block; margin: 0 auto; width: 240px; height: 160px; object-fit: contain; background: #fff; }
      .foto-titulo { font-size: 10pt; font-weight: 700; margin: 4pt 0; }
      .foto-pie { margin: 2pt 0 0; font-size: 8pt; color: #555; }
      table.firma { width: 100%; border: none; margin-top: 18pt; page-break-inside: avoid; }
      table.firma td { border: none; width: 50%; padding: 0 12pt 0 0; vertical-align: top; }
      table.firma .linea { border-top: 1px solid #111; padding-top: 4pt; font-size: 9pt; }`;
  }

  function downloadPDF() {
    const payload = $("modal").dataset.payload;
    if (!payload) { window.print(); return; }
    const { data, num } = JSON.parse(payload);
    const w = window.open("", "_blank");
    if (!w) { window.print(); return; }
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${num}</title>
      <style>${hojaEstilos()}</style></head>
      <body>${buildDocumento(data, num)}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  function openModal(data, num) {
    $("documento").innerHTML = buildDocumento(data, num);
    $("modalTitle").textContent = (data.tipo_label || "Oficio") + " · " + num;
    $("modal").hidden = false;
    $("modal").dataset.payload = JSON.stringify({ data, num });
  }

  function readFotos(files) {
    const disponibles = 4 - fotos.length;
    if (disponibles <= 0) {
      alert("Ya hay 4 fotografías. Quite alguna para agregar otra.");
      return;
    }
    const validas = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (validas.length > disponibles) {
      alert("Máximo 4 fotografías por oficio. Se tomarán solo las primeras " + disponibles + ".");
    }
    validas.slice(0, disponibles).forEach((file) => {
      recortarImagen(file, FOTO_ANCHO_PX * 3, FOTO_ALTO_PX * 3, 0.85)
        .then((dataUrl) => { fotos.push({ name: file.name, src: dataUrl }); renderFotos(); })
        .catch(() => alert("No se pudo procesar la imagen \"" + file.name + "\". Intente con otra foto."));
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

  $("pdfBtn").addEventListener("click", () => {
    downloadPDF();
  });

  applyConfig();
  renderTipos();
  showApp(unlocked());
})();
