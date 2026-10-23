(function () {
  "use strict";

  // ==================== DATOS ====================
  // Todo se guarda en una sola llave de localStorage:
  //   dias:        { "2026-10-23": { animo, animoNota, entrada, salida, gym, gymNota, peso, habitos: { id: true } } }
  //   movimientos: [ { id, fecha, tipo: "ingreso"|"gasto", monto, categoria, nota } ]
  //   config:      { habitos: [{id, nombre}], catGasto: [...], catIngreso: [...], presupuestos: { cat: monto } }
  const STORAGE_KEY = "miRegistro_v1";
  const RESPALDO_KEY = "miRegistro_ultimoRespaldo";

  const ANIMOS = [
    { valor: 1, emoji: "😞", texto: "Muy mal" },
    { valor: 2, emoji: "😕", texto: "Mal" },
    { valor: 3, emoji: "😐", texto: "Normal" },
    { valor: 4, emoji: "🙂", texto: "Bien" },
    { valor: 5, emoji: "😄", texto: "Muy bien" }
  ];

  const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Íconos de contorno (estilo del osito) para cada categoría. Son trazos SVG en una cuadrícula de 24x24.
  const ICONOS = {
    comida: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 7h3v11"/>',
    transporte: '<path d="M4 16V11l2-5h12l2 5v5H4zM4 11h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    casa: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6"/>',
    servicios: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    salud: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    diversion: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    ropa: '<path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c0 2-1.8 3-4 3S8 5 8 3z"/>',
    educacion: '<path d="M3 9l9-5 9 5-9 5-9-5zM7 11.5V16c2.5 2 7.5 2 10 0v-4.5"/>',
    sueldo: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
    honorarios: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>',
    dinero: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v1.5M12 16.5V18"/>',
    otro: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8" r="1.3"/>'
  };

  // Elige el ícono por el nombre de la categoría, así también funciona con las que tú agregues.
  const PALABRAS_ICONO = [
    [/comida|super|despensa|restaurante|caf[eé]/i, "comida"],
    [/transporte|gasolina|uber|auto|carro|cami[oó]n|metro/i, "transporte"],
    [/casa|renta|hogar/i, "casa"],
    [/servicio|luz|agua|internet|tel[eé]fono|celular/i, "servicios"],
    [/salud|doctor|m[eé]dic|farmacia|gym|gimnasio/i, "salud"],
    [/diversi[oó]n|cine|salida|fiesta|juego|spotify|netflix/i, "diversion"],
    [/ropa|zapato/i, "ropa"],
    [/educaci[oó]n|curso|escuela|libro/i, "educacion"],
    [/sueldo|n[oó]mina|salario/i, "sueldo"],
    [/honorario|factura|cliente/i, "honorarios"],
    [/ahorro|inversi[oó]n|venta|pr[eé]stamo/i, "dinero"]
  ];

  function iconoCategoria(categoria, tipo) {
    const hallado = PALABRAS_ICONO.find(function (p) { return p[0].test(categoria); });
    const nombre = hallado ? hallado[1] : (tipo === "ingreso" ? "dinero" : "otro");
    const span = document.createElement("span");
    span.className = "icono-cat";
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[nombre] + "</svg>";
    return span;
  }

  function datosIniciales() {
    return {
      dias: {},
      movimientos: [],
      config: {
        habitos: [
          { id: nuevoId(), nombre: "Tomar agua" },
          { id: nuevoId(), nombre: "Dormir 7 horas" },
          { id: nuevoId(), nombre: "Estudiar el curso" }
        ],
        catGasto: ["Comida", "Transporte", "Casa", "Servicios", "Salud", "Diversión", "Otro"],
        catIngreso: ["Sueldo", "Honorarios", "Otro"],
        presupuestos: {} // { "Comida": 1500 } = máximo por semana
      },
      musica: { porDia: {}, hasta: "" }
    };
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.dias && d.movimientos && d.config) return completar(d);
      }
    } catch (e) {
      console.error("Error leyendo datos", e);
    }
    return datosIniciales();
  }

  // Datos guardados con una versión anterior de la app no traen los campos nuevos.
  function completar(d) {
    d.config.presupuestos = d.config.presupuestos || {};
    // Tiempo de música: milisegundos por día y la última canción ya contada.
    d.musica = d.musica || { porDia: {}, hasta: "" };
    return d;
  }

  let datos = cargar();

  function guardar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  }

  function getDia(fecha) {
    return datos.dias[fecha] || { habitos: {} };
  }

  // Guarda un cambio en el día; si el día queda vacío, lo borra para no acumular basura.
  function setDia(fecha, cambios) {
    const dia = Object.assign({ habitos: {} }, datos.dias[fecha], cambios);
    const vacio = !dia.animo && !dia.animoNota && !dia.entrada && !dia.salida &&
      !dia.gym && !dia.gymNota && !dia.peso && !Object.values(dia.habitos).some(Boolean);
    if (vacio) delete datos.dias[fecha];
    else datos.dias[fecha] = dia;
    guardar();
  }

  // ==================== FECHAS ====================
  // Ojo: NO usar toISOString(), porque convierte a hora UTC y en la noche
  // (en México) daría la fecha de mañana.
  function fechaATexto(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + dia;
  }

  function textoAFecha(s) {
    const [a, m, d] = s.split("-").map(Number);
    return new Date(a, m - 1, d);
  }

  function sumarDias(s, n) {
    const d = textoAFecha(s);
    d.setDate(d.getDate() + n);
    return fechaATexto(d);
  }

  function hoy() {
    return fechaATexto(new Date());
  }

  // Lunes de la semana a la que pertenece la fecha.
  function lunesDe(s) {
    const d = textoAFecha(s);
    const diaJs = d.getDay(); // 0 = domingo
    const atras = diaJs === 0 ? 6 : diaJs - 1;
    return sumarDias(s, -atras);
  }

  function fechaLarga(s) {
    const t = textoAFecha(s).toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function fechaCorta(s) {
    return textoAFecha(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  // ==================== CÁLCULOS ====================
  // Horas entre entrada y salida. Si la salida es menor, se asume que cruzó la medianoche.
  function horasTrabajadas(dia) {
    if (!dia.entrada || !dia.salida) return 0;
    const [he, me] = dia.entrada.split(":").map(Number);
    const [hs, ms] = dia.salida.split(":").map(Number);
    let minutos = (hs * 60 + ms) - (he * 60 + me);
    if (minutos < 0) minutos += 24 * 60;
    return minutos / 60;
  }

  function formatoHoras(h) {
    const total = Math.round(h * 60);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return mm ? hh + " h " + mm + " min" : hh + " h";
  }

  const fmtDinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
  function dinero(n) {
    return fmtDinero.format(n);
  }

  function movimientosDe(fecha) {
    return datos.movimientos.filter(function (m) { return m.fecha === fecha; });
  }

  // Días seguidos (hacia atrás desde "fecha") en que se cumplió la condición.
  // Si ese día todavía no lo marcas, empieza a contar desde el día anterior,
  // para que la racha no se vea en 0 a media mañana.
  function racha(fecha, cumple) {
    let f = cumple(getDia(fecha)) ? fecha : sumarDias(fecha, -1);
    let n = 0;
    while (cumple(getDia(f))) {
      n++;
      f = sumarDias(f, -1);
    }
    return n;
  }

  function textoRacha(n) {
    return n >= 2 ? "🔥 " + n + " días seguidos" : "";
  }

  // Lo gastado en una categoría durante la semana (lunes a domingo) de "fecha".
  function gastoSemanaCategoria(fecha, categoria) {
    const lunes = lunesDe(fecha);
    const domingo = sumarDias(lunes, 6);
    return datos.movimientos.reduce(function (suma, m) {
      const enSemana = m.fecha >= lunes && m.fecha <= domingo;
      return enSemana && m.tipo === "gasto" && m.categoria === categoria ? suma + m.monto : suma;
    }, 0);
  }

  // ==================== UTILIDADES DOM ====================
  const $ = function (id) { return document.getElementById(id); };

  function el(tag, props, hijos) {
    const e = document.createElement(tag);
    if (props) Object.assign(e, props);
    (hijos || []).forEach(function (h) {
      e.append(h);
    });
    return e;
  }

  // ==================== PESTAÑAS ====================
  function mostrarTab(nombre) {
    document.querySelectorAll(".tab-panel").forEach(function (p) {
      p.hidden = p.id !== "tab-" + nombre;
    });
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === nombre);
    });
    if (nombre === "hoy") renderHoy();
    if (nombre === "semana") renderSemana();
    if (nombre === "mes") renderMes();
    if (nombre === "ajustes") renderAjustes();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".nav-btn").forEach(function (b) {
    b.addEventListener("click", function () { mostrarTab(b.dataset.tab); });
  });

  // ==================== HOY ====================
  let fechaActual = hoy();

  function renderHoy() {
    const dia = getDia(fechaActual);
    $("fecha-dia").value = fechaActual;
    $("fecha-texto").textContent = (fechaActual === hoy() ? "Hoy · " : "") + fechaLarga(fechaActual);

    // Ánimo
    const cont = $("animo-opciones");
    cont.innerHTML = "";
    ANIMOS.forEach(function (a) {
      const b = el("button", {
        type: "button",
        className: "animo-btn" + (dia.animo === a.valor ? " seleccionado" : ""),
        title: a.texto,
        textContent: a.emoji
      });
      b.setAttribute("aria-label", a.texto);
      b.addEventListener("click", function () {
        // Tocar la carita ya seleccionada la quita.
        setDia(fechaActual, { animo: dia.animo === a.valor ? null : a.valor });
        renderHoy();
      });
      cont.append(b);
    });
    $("animo-nota").value = dia.animoNota || "";

    // Trabajo
    $("trabajo-entrada").value = dia.entrada || "";
    $("trabajo-salida").value = dia.salida || "";
    const h = horasTrabajadas(dia);
    $("trabajo-horas").textContent = h ? "Trabajaste " + formatoHoras(h) : "";

    // Gimnasio
    $("gym-fui").checked = !!dia.gym;
    $("gym-nota").value = dia.gymNota || "";
    $("gym-racha").textContent = textoRacha(racha(fechaActual, function (d) { return d.gym; }));
    $("peso").value = dia.peso || "";

    // Hábitos
    const lista = $("habitos-lista");
    lista.innerHTML = "";
    datos.config.habitos.forEach(function (hab) {
      const cb = el("input", { type: "checkbox", checked: !!dia.habitos[hab.id] });
      const spanRacha = el("span", { className: "racha" });
      const actualizarRacha = function () {
        spanRacha.textContent = textoRacha(racha(fechaActual, function (d) { return d.habitos[hab.id]; }));
      };
      cb.addEventListener("change", function () {
        const habitos = Object.assign({}, getDia(fechaActual).habitos);
        habitos[hab.id] = cb.checked;
        setDia(fechaActual, { habitos: habitos });
        actualizarRacha();
      });
      actualizarRacha();
      lista.append(el("label", { className: "check-grande" }, [cb, " " + hab.nombre + " ", spanRacha]));
    });
    $("habitos-vacio").hidden = datos.config.habitos.length > 0;

    renderCategoriasSelect();
    renderMovimientosDia();
    renderMusica();
  }

  function renderCategoriasSelect() {
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const cats = tipo === "ingreso" ? datos.config.catIngreso : datos.config.catGasto;
    const sel = $("mov-categoria");
    const previa = sel.value;
    sel.innerHTML = "";
    cats.forEach(function (c) { sel.append(el("option", { value: c, textContent: c })); });
    if (cats.includes(previa)) sel.value = previa;
  }

  function renderMovimientosDia() {
    const ul = $("movimientos-dia");
    ul.innerHTML = "";
    movimientosDe(fechaActual).forEach(function (m) {
      const borrar = el("button", { type: "button", className: "btn-borrar", textContent: "✕" });
      borrar.setAttribute("aria-label", "Borrar");
      borrar.addEventListener("click", function () {
        if (!confirm("¿Borrar este movimiento de " + dinero(m.monto) + "?")) return;
        datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== m.id; });
        guardar();
        renderMovimientosDia();
      });
      ul.append(el("li", { className: m.tipo }, [
        iconoCategoria(m.categoria, m.tipo),
        el("span", { className: "mov-info" }, [
          el("strong", { textContent: m.categoria }),
          m.nota ? el("small", { textContent: m.nota }) : ""
        ]),
        el("span", {
          className: "mov-monto",
          textContent: (m.tipo === "gasto" ? "−" : "+") + dinero(m.monto)
        }),
        borrar
      ]));
    });
  }

  $("dia-anterior").addEventListener("click", function () {
    fechaActual = sumarDias(fechaActual, -1);
    renderHoy();
  });
  $("dia-siguiente").addEventListener("click", function () {
    fechaActual = sumarDias(fechaActual, 1);
    renderHoy();
  });
  $("fecha-dia").addEventListener("change", function (e) {
    if (e.target.value) { fechaActual = e.target.value; renderHoy(); }
  });

  // Los campos de texto se guardan mientras escribes.
  $("animo-nota").addEventListener("input", function (e) {
    setDia(fechaActual, { animoNota: e.target.value });
  });
  $("trabajo-entrada").addEventListener("change", function (e) {
    setDia(fechaActual, { entrada: e.target.value });
    renderHoy();
  });
  $("trabajo-salida").addEventListener("change", function (e) {
    setDia(fechaActual, { salida: e.target.value });
    renderHoy();
  });
  $("gym-fui").addEventListener("change", function (e) {
    setDia(fechaActual, { gym: e.target.checked });
    $("gym-racha").textContent = textoRacha(racha(fechaActual, function (d) { return d.gym; }));
  });
  $("peso").addEventListener("change", function (e) {
    const kg = parseFloat(e.target.value);
    setDia(fechaActual, { peso: kg > 0 ? Math.round(kg * 10) / 10 : null });
  });
  $("gym-nota").addEventListener("input", function (e) {
    setDia(fechaActual, { gymNota: e.target.value });
  });

  document.querySelectorAll('input[name="tipo"]').forEach(function (r) {
    r.addEventListener("change", renderCategoriasSelect);
  });

  $("form-movimiento").addEventListener("submit", function (e) {
    e.preventDefault();
    const monto = parseFloat($("mov-monto").value);
    if (!(monto > 0)) return;
    const mov = {
      id: nuevoId(),
      fecha: fechaActual,
      tipo: document.querySelector('input[name="tipo"]:checked').value,
      monto: Math.round(monto * 100) / 100,
      categoria: $("mov-categoria").value,
      nota: $("mov-nota").value.trim()
    };
    datos.movimientos.push(mov);
    guardar();
    $("mov-monto").value = "";
    $("mov-nota").value = "";
    renderMovimientosDia();
    avisarPresupuesto(mov);
  });

  // Después de agregar un gasto, avisa si ya te acercaste o pasaste del presupuesto semanal.
  function avisarPresupuesto(mov) {
    const aviso = $("aviso-presupuesto");
    const limite = datos.config.presupuestos[mov.categoria];
    aviso.hidden = true;
    if (mov.tipo !== "gasto" || !limite) return;
    const gastado = gastoSemanaCategoria(mov.fecha, mov.categoria);
    const texto = mov.categoria + " esta semana: " + dinero(gastado) + " de " + dinero(limite) + ".";
    if (gastado > limite) {
      aviso.textContent = "⚠️ Te pasaste del presupuesto. " + texto;
    } else if (gastado >= limite * 0.8) {
      aviso.textContent = "Ojo, ya vas cerca del límite. " + texto;
    } else {
      return;
    }
    aviso.hidden = false;
  }

  // ==================== SEMANA ====================
  let lunesActual = lunesDe(hoy());

  function renderSemana() {
    const fechas = [];
    for (let i = 0; i < 7; i++) fechas.push(sumarDias(lunesActual, i));
    $("semana-rango").textContent = fechaCorta(fechas[0]) + " – " + fechaCorta(fechas[6]);

    let ingresos = 0, gastos = 0, horas = 0, diasGym = 0, sumaAnimo = 0, diasAnimo = 0;
    const porCategoria = {};
    const conteoHabitos = {};
    const tbody = $("sem-dias");
    tbody.innerHTML = "";

    fechas.forEach(function (f, i) {
      const dia = getDia(f);
      let ingDia = 0, gasDia = 0;
      movimientosDe(f).forEach(function (m) {
        if (m.tipo === "ingreso") ingDia += m.monto;
        else {
          gasDia += m.monto;
          porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.monto;
        }
      });
      ingresos += ingDia;
      gastos += gasDia;
      const h = horasTrabajadas(dia);
      horas += h;
      if (dia.gym) diasGym++;
      if (dia.animo) { sumaAnimo += dia.animo; diasAnimo++; }
      Object.keys(dia.habitos).forEach(function (id) {
        if (dia.habitos[id]) conteoHabitos[id] = (conteoHabitos[id] || 0) + 1;
      });

      const animo = ANIMOS.find(function (a) { return a.valor === dia.animo; });
      const tr = el("tr", { className: f === hoy() ? "es-hoy" : "" }, [
        el("td", { textContent: DIAS_SEMANA[i] + " " + textoAFecha(f).getDate() }),
        el("td", { textContent: animo ? animo.emoji : "" }),
        el("td", { textContent: h ? formatoHoras(h) : "" }),
        el("td", { textContent: dia.gym ? "✔" : "" }),
        el("td", { className: "positivo", textContent: ingDia ? dinero(ingDia) : "" }),
        el("td", { className: "negativo", textContent: gasDia ? dinero(gasDia) : "" })
      ]);
      tr.addEventListener("click", function () {
        fechaActual = f;
        mostrarTab("hoy");
      });
      tbody.append(tr);
    });

    $("sem-ingresos").textContent = dinero(ingresos);
    $("sem-gastos").textContent = dinero(gastos);
    const saldo = ingresos - gastos;
    $("sem-saldo").textContent = dinero(saldo);
    $("sem-saldo").className = "valor " + (saldo < 0 ? "negativo" : "positivo");

    $("sem-horas").textContent = formatoHoras(horas);
    $("sem-gym").textContent = diasGym + " de 7";
    if (diasAnimo) {
      const prom = sumaAnimo / diasAnimo;
      $("sem-animo").textContent = ANIMOS[Math.round(prom) - 1].emoji + " " + prom.toFixed(1);
    } else {
      $("sem-animo").textContent = "—";
    }

    barrasCategoria($("sem-categorias"), porCategoria, datos.config.presupuestos, "Sin gastos esta semana.");

    // Último peso registrado en la semana, comparado con el último antes de la semana.
    const pesoSemana = ultimoPeso(fechas[0], fechas[6]);
    const pesoAntes = ultimoPeso("0000-01-01", sumarDias(fechas[0], -1));
    let textoPeso = "";
    if (pesoSemana) {
      textoPeso = "Peso: " + pesoSemana + " kg";
      if (pesoAntes) {
        const dif = Math.round((pesoSemana - pesoAntes) * 10) / 10;
        textoPeso += " (" + (dif > 0 ? "+" : "") + dif + " kg vs. antes)";
      }
    }
    $("sem-peso").textContent = textoPeso;

    const msMusica = fechas.reduce(function (s, f) { return s + (datos.musica.porDia[f] || 0); }, 0);
    $("sem-musica").textContent = msMusica ? "Música: ≈ " + formatoHoras(msMusica / 3600000) : "";

    const ulHab = $("sem-habitos");
    ulHab.innerHTML = "";
    datos.config.habitos.forEach(function (hab) {
      ulHab.append(el("li", {}, [
        el("span", { textContent: hab.nombre }),
        el("span", { textContent: (conteoHabitos[hab.id] || 0) + " de 7" })
      ]));
    });
  }

  $("semana-anterior").addEventListener("click", function () {
    lunesActual = sumarDias(lunesActual, -7);
    renderSemana();
  });
  $("semana-siguiente").addEventListener("click", function () {
    lunesActual = sumarDias(lunesActual, 7);
    renderSemana();
  });

  function ultimoPeso(desde, hasta) {
    const fechas = Object.keys(datos.dias).filter(function (f) {
      return f >= desde && f <= hasta && datos.dias[f].peso;
    }).sort();
    return fechas.length ? datos.dias[fechas[fechas.length - 1]].peso : null;
  }

  // Barras horizontales de gasto por categoría. Si hay presupuesto, la barra
  // se mide contra el límite y se pone en rosa fuerte cuando te pasas.
  function barrasCategoria(cont, montos, presupuestos, textoVacio) {
    cont.innerHTML = "";
    const cats = Object.keys(montos);
    if (presupuestos) {
      Object.keys(presupuestos).forEach(function (c) { if (!cats.includes(c)) cats.push(c); });
    }
    if (!cats.length) {
      cont.append(el("p", { className: "hint", textContent: textoVacio }));
      return;
    }
    cats.sort(function (a, b) { return (montos[b] || 0) - (montos[a] || 0); });
    const maximo = Math.max.apply(null, cats.map(function (c) { return montos[c] || 0; }));
    cats.forEach(function (c) {
      const monto = montos[c] || 0;
      const limite = presupuestos && presupuestos[c];
      const pasado = limite && monto > limite;
      const ancho = limite ? Math.min(monto / limite, 1) : (maximo ? monto / maximo : 0);
      cont.append(el("div", { className: "barra-fila" + (pasado ? " pasado" : "") }, [
        el("div", { className: "barra-texto" }, [
          el("span", { className: "barra-nombre" }, [iconoCategoria(c, "gasto"), c]),
          el("span", { textContent: dinero(monto) + (limite ? " de " + dinero(limite) : "") })
        ]),
        el("div", { className: "barra-fondo" }, [
          el("div", { className: "barra", style: "width:" + (ancho * 100) + "%" })
        ]),
        pasado ? el("small", { textContent: "⚠️ Te pasaste por " + dinero(monto - limite) }) : ""
      ]));
    });
  }

  // ==================== MES ====================
  let mesActual = hoy().slice(0, 7); // "2026-10"

  function diasDelMes(mes) {
    const [a, m] = mes.split("-").map(Number);
    const total = new Date(a, m, 0).getDate();
    const fechas = [];
    for (let d = 1; d <= total; d++) fechas.push(mes + "-" + String(d).padStart(2, "0"));
    return fechas;
  }

  function cambiarMes(n) {
    const [a, m] = mesActual.split("-").map(Number);
    mesActual = fechaATexto(new Date(a, m - 1 + n, 1)).slice(0, 7);
    renderMes();
  }
  $("mes-anterior").addEventListener("click", function () { cambiarMes(-1); });
  $("mes-siguiente").addEventListener("click", function () { cambiarMes(1); });

  function renderMes() {
    const fechas = diasDelMes(mesActual);
    const nombre = textoAFecha(fechas[0]).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    $("mes-nombre").textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);

    let ingresos = 0, gastos = 0, horas = 0, diasGym = 0, sumaAnimo = 0, diasAnimo = 0;
    const porCategoria = {};
    datos.movimientos.forEach(function (m) {
      if (m.fecha.slice(0, 7) !== mesActual) return;
      if (m.tipo === "ingreso") ingresos += m.monto;
      else {
        gastos += m.monto;
        porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.monto;
      }
    });
    const animos = [], horasDia = [], pesos = [];
    fechas.forEach(function (f) {
      const dia = getDia(f);
      const h = horasTrabajadas(dia);
      horas += h;
      if (dia.gym) diasGym++;
      if (dia.animo) { sumaAnimo += dia.animo; diasAnimo++; }
      animos.push(dia.animo || null);
      horasDia.push(h || null);
      pesos.push(dia.peso || null);
    });

    $("mes-ingresos").textContent = dinero(ingresos);
    $("mes-gastos").textContent = dinero(gastos);
    const saldo = ingresos - gastos;
    $("mes-saldo").textContent = dinero(saldo);
    $("mes-saldo").className = "valor " + (saldo < 0 ? "negativo" : "positivo");
    $("mes-horas").textContent = formatoHoras(horas);
    $("mes-gym").textContent = diasGym + (diasGym === 1 ? " día" : " días");
    $("mes-animo").textContent = diasAnimo
      ? ANIMOS[Math.round(sumaAnimo / diasAnimo) - 1].emoji + " " + (sumaAnimo / diasAnimo).toFixed(1)
      : "—";

    barrasCategoria($("graf-categorias"), porCategoria, null, "Sin gastos este mes.");

    graficaDias($("graf-animo"), fechas, animos, {
      tipo: "linea", color: "var(--principal)", min: 1, max: 5,
      marcasY: [1, 2, 3, 4, 5],
      etiquetaY: function (v) { return ANIMOS[v - 1].emoji; },
      tip: function (v) { const a = ANIMOS[v - 1]; return a.emoji + " " + a.texto; }
    });

    const maxHoras = Math.max(8, Math.ceil(Math.max.apply(null, horasDia.map(Number)) / 2) * 2);
    graficaDias($("graf-horas"), fechas, horasDia, {
      tipo: "barras", color: "var(--sasuke)", min: 0, max: maxHoras,
      marcasY: [0, maxHoras / 2, maxHoras],
      etiquetaY: function (v) { return v + " h"; },
      tip: formatoHoras
    });

    const conPeso = pesos.filter(Boolean);
    const pMin = Math.floor(Math.min.apply(null, conPeso) - 1);
    const pMax = Math.ceil(Math.max.apply(null, conPeso) + 1);
    graficaDias($("graf-peso"), fechas, pesos, {
      tipo: "linea", color: "var(--sasuke)", min: pMin, max: pMax,
      marcasY: [pMin, pMax],
      etiquetaY: String,
      tip: function (v) { return v + " kg"; }
    });
  }

  // Gráfica de un valor por día del mes, en SVG.
  // valores[i] corresponde a fechas[i]; null = ese día no hay dato.
  // Al tocar (o pasar el mouse sobre) un día, se muestra su valor debajo.
  function graficaDias(cont, fechas, valores, op) {
    cont.innerHTML = "";
    if (!valores.some(function (v) { return v !== null; })) {
      cont.append(el("p", { className: "hint", textContent: "Sin datos este mes." }));
      return;
    }
    const NS = "http://www.w3.org/2000/svg";
    const W = 320, H = 150, izq = 34, der = 6, arriba = 10, abajo = 20;
    const paso = (W - izq - der) / fechas.length;
    const y = function (v) { return arriba + (H - arriba - abajo) * (1 - (v - op.min) / (op.max - op.min)); };
    const x = function (i) { return izq + paso * i + paso / 2; };

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "svg-grafica");
    const nodo = function (tag, attrs, texto) {
      const n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (texto !== undefined) n.textContent = texto;
      svg.append(n);
      return n;
    };

    // Líneas guía y etiquetas del eje Y
    op.marcasY.forEach(function (v) {
      nodo("line", { x1: izq, x2: W - der, y1: y(v), y2: y(v), class: "guia" });
      nodo("text", { x: izq - 5, y: y(v) + 3, "text-anchor": "end", class: "eje" }, op.etiquetaY(v));
    });
    // Etiquetas del eje X: días 1, 8, 15, 22, 29
    [0, 7, 14, 21, 28].forEach(function (i) {
      if (i < fechas.length) nodo("text", { x: x(i), y: H - 5, "text-anchor": "middle", class: "eje" }, i + 1);
    });

    const puntos = [];
    valores.forEach(function (v, i) {
      if (v === null) return;
      if (op.tipo === "barras") {
        const ancho = Math.max(paso - 2, 2);
        nodo("rect", {
          x: x(i) - ancho / 2, y: y(v), width: ancho, height: y(op.min) - y(v),
          rx: Math.min(2, ancho / 2), fill: op.color
        });
      } else {
        puntos.push(x(i) + "," + y(v));
      }
    });
    if (op.tipo === "linea") {
      if (puntos.length > 1) {
        nodo("polyline", { points: puntos.join(" "), fill: "none", stroke: op.color, "stroke-width": 2, "stroke-linejoin": "round" });
      }
      valores.forEach(function (v, i) {
        if (v !== null) nodo("circle", { cx: x(i), cy: y(v), r: 3.5, fill: op.color, stroke: "#fff", "stroke-width": 1.5 });
      });
    }

    // Zonas invisibles (una por día, más grandes que la marca) para tocar con el dedo.
    const tip = el("p", { className: "grafica-tip", textContent: "Toca un día para ver su valor." });
    const marca = nodo("line", { x1: 0, x2: 0, y1: arriba, y2: H - abajo, class: "cursor", visibility: "hidden" });
    fechas.forEach(function (f, i) {
      const zona = nodo("rect", { x: izq + paso * i, y: 0, width: paso, height: H - abajo, fill: "transparent" });
      const mostrar = function () {
        const d = textoAFecha(f);
        const etiqueta = DIAS_SEMANA[(d.getDay() + 6) % 7] + " " + d.getDate();
        tip.textContent = etiqueta + ": " + (valores[i] === null ? "sin dato" : op.tip(valores[i]));
        marca.setAttribute("x1", x(i));
        marca.setAttribute("x2", x(i));
        marca.setAttribute("visibility", "visible");
      };
      zona.addEventListener("pointerenter", mostrar);
      zona.addEventListener("pointerdown", mostrar);
    });

    cont.append(svg, tip);
  }

  // ==================== AJUSTES ====================
  function renderListaEditable(ulId, items, textoDe, alBorrar, tipoIcono) {
    const ul = $(ulId);
    ul.innerHTML = "";
    items.forEach(function (item) {
      const borrar = el("button", { type: "button", className: "btn-borrar", textContent: "✕" });
      borrar.setAttribute("aria-label", "Quitar");
      borrar.addEventListener("click", function () {
        if (!confirm("¿Quitar \"" + textoDe(item) + "\"?")) return;
        alBorrar(item);
        guardar();
        renderAjustes();
      });
      const nombre = el("span", { className: "barra-nombre" }, [tipoIcono ? iconoCategoria(textoDe(item), tipoIcono) : "", textoDe(item)]);
      ul.append(el("li", {}, [nombre, borrar]));
    });
  }

  function renderAjustes() {
    const cfg = datos.config;
    // Quitar un hábito no borra lo que ya marcaste en días pasados; solo deja de mostrarse.
    renderListaEditable("cfg-habitos", cfg.habitos, function (h) { return h.nombre; }, function (h) {
      cfg.habitos = cfg.habitos.filter(function (x) { return x.id !== h.id; });
    });
    renderListaEditable("cfg-cat-gasto", cfg.catGasto, String, function (c) {
      cfg.catGasto = cfg.catGasto.filter(function (x) { return x !== c; });
    }, "gasto");
    renderListaEditable("cfg-cat-ingreso", cfg.catIngreso, String, function (c) {
      cfg.catIngreso = cfg.catIngreso.filter(function (x) { return x !== c; });
    }, "ingreso");

    // Presupuestos: un campo por categoría de gasto
    const contPres = $("cfg-presupuestos");
    contPres.innerHTML = "";
    cfg.catGasto.forEach(function (c) {
      const input = el("input", {
        type: "number", min: "0", step: "1", inputMode: "decimal",
        placeholder: "Sin límite", value: cfg.presupuestos[c] || ""
      });
      input.addEventListener("change", function () {
        const monto = parseFloat(input.value);
        if (monto > 0) cfg.presupuestos[c] = monto;
        else delete cfg.presupuestos[c];
        guardar();
      });
      contPres.append(el("label", { className: "fila-presupuesto" }, [
        el("span", { className: "barra-nombre" }, [iconoCategoria(c, "gasto"), c]), input
      ]));
    });

    let ultimo = null;
    try { ultimo = localStorage.getItem(RESPALDO_KEY); } catch (e) { /* sin acceso */ }
    $("ultimo-respaldo").textContent = ultimo
      ? "Último respaldo: " + fechaLarga(ultimo)
      : "Todavía no has descargado ningún respaldo.";

    renderSpotifyAjustes();
  }

  function agregarALista(formId, inputId, alAgregar) {
    $(formId).addEventListener("submit", function (e) {
      e.preventDefault();
      const texto = $(inputId).value.trim();
      if (!texto) return;
      alAgregar(texto);
      guardar();
      $(inputId).value = "";
      renderAjustes();
    });
  }

  agregarALista("form-habito", "nuevo-habito", function (t) {
    datos.config.habitos.push({ id: nuevoId(), nombre: t });
  });
  agregarALista("form-cat-gasto", "nueva-cat-gasto", function (t) {
    if (!datos.config.catGasto.includes(t)) datos.config.catGasto.push(t);
  });
  // Al quitar una categoría de gasto, también se quita su presupuesto.
  $("cfg-cat-gasto").addEventListener("click", function () {
    Object.keys(datos.config.presupuestos).forEach(function (c) {
      if (!datos.config.catGasto.includes(c)) delete datos.config.presupuestos[c];
    });
    guardar();
  });
  agregarALista("form-cat-ingreso", "nueva-cat-ingreso", function (t) {
    if (!datos.config.catIngreso.includes(t)) datos.config.catIngreso.push(t);
  });

  // ==================== DESCARGAS ====================
  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const a = el("a", { href: URL.createObjectURL(blob), download: nombre });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  // ==================== EXPORTAR A EXCEL (CSV) ====================
  // Si el texto trae comas, comillas o saltos de línea, va entre comillas
  // y las comillas internas se duplican (así lo pide el formato CSV).
  function campoCsv(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function armarCsv(filas) {
    // El "﻿" al inicio hace que Excel lea bien los acentos y la ñ.
    return "﻿" + filas.map(function (f) { return f.map(campoCsv).join(","); }).join("\r\n");
  }

  $("btn-csv-movimientos").addEventListener("click", function () {
    const movs = datos.movimientos.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
    const filas = [["Fecha", "Tipo", "Categoría", "Monto", "Nota"]];
    movs.forEach(function (m) {
      filas.push([m.fecha, m.tipo === "ingreso" ? "Ingreso" : "Gasto", m.categoria, m.monto.toFixed(2), m.nota]);
    });
    descargar("kuma-day-dinero-" + hoy() + ".csv", armarCsv(filas), "text/csv");
  });

  $("btn-csv-dias").addEventListener("click", function () {
    const habitos = datos.config.habitos;
    const filas = [["Fecha", "Día", "Ánimo (1-5)", "Nota ánimo", "Entrada", "Salida", "Horas",
      "Gimnasio", "Qué hiciste", "Peso (kg)", "Música (min, aprox.)"].concat(habitos.map(function (h) { return h.nombre; }))];
    // Días con algún dato, o solo con música escuchada.
    const todas = Object.keys(Object.assign({}, datos.dias, datos.musica.porDia)).sort();
    todas.forEach(function (f) {
      const d = getDia(f);
      const h = horasTrabajadas(d);
      const ms = datos.musica.porDia[f];
      filas.push([
        f, DIAS_SEMANA[(textoAFecha(f).getDay() + 6) % 7], d.animo || "", d.animoNota || "",
        d.entrada || "", d.salida || "", h ? h.toFixed(2) : "",
        d.gym ? "Sí" : "", d.gymNota || "", d.peso || "", ms ? Math.round(ms / 60000) : ""
      ].concat(habitos.map(function (hab) { return d.habitos[hab.id] ? "Sí" : ""; })));
    });
    descargar("kuma-day-dias-" + hoy() + ".csv", armarCsv(filas), "text/csv");
  });

  // ==================== RESPALDO ====================
  $("btn-exportar").addEventListener("click", function () {
    descargar("kuma-day-" + hoy() + ".json", JSON.stringify(datos, null, 2), "application/json");
    localStorage.setItem(RESPALDO_KEY, hoy());
    renderAjustes();
  });

  $("input-importar").addEventListener("change", function (e) {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function () {
      let nuevos;
      try {
        nuevos = JSON.parse(lector.result);
      } catch (err) {
        alert("Ese archivo no es un respaldo válido.");
        return;
      }
      if (!nuevos || !nuevos.dias || !nuevos.movimientos || !nuevos.config) {
        alert("Ese archivo no es un respaldo de Kuma Day.");
        return;
      }
      const resumen = Object.keys(nuevos.dias).length + " días y " +
        nuevos.movimientos.length + " movimientos";
      if (!confirm("Esto REEMPLAZA todo lo que tienes ahora con el respaldo (" + resumen + "). ¿Continuar?")) return;
      datos = completar(nuevos);
      guardar();
      alert("Respaldo restaurado.");
      mostrarTab("hoy");
    };
    lector.readAsText(archivo);
  });

  // ==================== SPOTIFY ====================
  // Conexión con "Authorization Code + PKCE": el método que Spotify recomienda para apps
  // sin servidor. Kuma Day nunca ve tu contraseña: inicias sesión en la página de Spotify
  // y Spotify nos regresa un permiso ("token") que se guarda solo en este celular.
  // El token NO va en el respaldo; si restauras en otro celular, vuelves a conectar.
  const SPOT_KEY = "kumaDay_spotify"; // { clientId, verifier, token, refresh, expira }
  const SPOT_PERMISOS = [
    "user-read-playback-state", "user-modify-playback-state",
    "user-read-currently-playing", "user-read-recently-played"
  ].join(" ");

  function spotLeer() {
    try { return JSON.parse(localStorage.getItem(SPOT_KEY)) || {}; } catch (e) { return {}; }
  }
  function spotGuardar(s) { localStorage.setItem(SPOT_KEY, JSON.stringify(s)); }
  function spotConectado() { return !!spotLeer().refresh; }

  // La dirección a la que Spotify regresa después de iniciar sesión: esta misma página, sin "index.html".
  function spotRedirect() {
    return location.origin + location.pathname.replace(/index\.html$/, "");
  }

  function base64url(bytes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function spotConectar() {
    const clientId = $("spot-client-id").value.trim();
    if (!clientId) { alert("Primero pega tu Client ID."); return; }
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
    const reto = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    spotGuardar({ clientId: clientId, verifier: verifier });
    const params = new URLSearchParams({
      client_id: clientId, response_type: "code", redirect_uri: spotRedirect(),
      code_challenge_method: "S256", code_challenge: reto, scope: SPOT_PERMISOS
    });
    location.href = "https://accounts.spotify.com/authorize?" + params;
  }

  async function spotPedirToken(params) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params)
    });
    if (!r.ok) throw new Error("Spotify rechazó el permiso (" + r.status + ")");
    const t = await r.json();
    const s = spotLeer();
    s.token = t.access_token;
    if (t.refresh_token) s.refresh = t.refresh_token;
    s.expira = Date.now() + (t.expires_in - 60) * 1000;
    delete s.verifier;
    spotGuardar(s);
  }

  // Al regresar de Spotify, la dirección trae "?code=..." (o "?error=..." si cancelaste).
  async function spotAlRegresar() {
    const q = new URLSearchParams(location.search);
    if (!q.has("code") && !q.has("error")) return;
    history.replaceState(null, "", spotRedirect());
    const s = spotLeer();
    if (q.has("error") || !s.verifier) {
      alert("No se conectó Spotify.");
      return;
    }
    try {
      await spotPedirToken({
        grant_type: "authorization_code", code: q.get("code"), redirect_uri: spotRedirect(),
        client_id: s.clientId, code_verifier: s.verifier
      });
    } catch (e) {
      alert(e.message);
    }
  }

  // Llama a Spotify. Renueva el token solo cuando ya venció (dura una hora).
  async function spot(ruta, metodo) {
    let s = spotLeer();
    if (!s.refresh) return null;
    if (!s.token || Date.now() > s.expira) {
      await spotPedirToken({ grant_type: "refresh_token", refresh_token: s.refresh, client_id: s.clientId });
      s = spotLeer();
    }
    const r = await fetch("https://api.spotify.com/v1" + ruta, {
      method: metodo || "GET",
      headers: { Authorization: "Bearer " + s.token }
    });
    if (r.status === 204) return null;
    if (r.status === 404) throw new Error("NO_DEVICE");
    if (r.status === 403) throw new Error("PREMIUM");
    if (!r.ok) throw new Error("Error de Spotify (" + r.status + ")");
    const texto = await r.text();
    return texto ? JSON.parse(texto) : null;
  }

  function spotMensajeError(e) {
    if (e.message === "NO_DEVICE") return "Abre Spotify en tu celular o compu y pon algo; luego vuelve a intentar.";
    if (e.message === "PREMIUM") return "Spotify no dejó hacer eso (revisa que tu cuenta sea Premium).";
    return "No se pudo hablar con Spotify: " + e.message;
  }

  let spotSonando = false;

  async function spotActualizarSonando() {
    try {
      const p = await spot("/me/player");
      const item = p && p.item;
      spotSonando = !!(p && p.is_playing);
      $("spot-cancion").textContent = item ? item.name : "No hay nada sonando";
      $("spot-artista").textContent = item && item.artists ? item.artists.map(function (a) { return a.name; }).join(", ") : "";
      const img = item && item.album && item.album.images && item.album.images[item.album.images.length > 1 ? 1 : 0];
      $("spot-portada").hidden = !img;
      if (img) $("spot-portada").src = img.url;
      $("spot-play").textContent = spotSonando ? "⏸" : "▶";
      $("spot-mensaje").textContent = item ? "" : "Abre Spotify y pon algo para controlarlo desde aquí.";
    } catch (e) {
      $("spot-mensaje").textContent = spotMensajeError(e);
    }
  }

  async function spotControl(ruta, metodo) {
    try {
      await spot(ruta, metodo);
      setTimeout(spotActualizarSonando, 500); // Spotify tarda un poco en cambiar de canción
    } catch (e) {
      $("spot-mensaje").textContent = spotMensajeError(e);
    }
  }

  $("spot-play").addEventListener("click", function () {
    spotControl(spotSonando ? "/me/player/pause" : "/me/player/play", "PUT");
  });
  $("spot-siguiente").addEventListener("click", function () { spotControl("/me/player/next", "POST"); });
  $("spot-anterior").addEventListener("click", function () { spotControl("/me/player/previous", "POST"); });

  // Tiempo de música (aproximado): Spotify solo enseña las últimas 50 canciones,
  // así que cada vez que abres la app sumamos las que todavía no habíamos contado.
  let spotUltimaSuma = 0;
  async function spotSumarEscuchas() {
    if (Date.now() - spotUltimaSuma < 60000) return; // máximo una vez por minuto
    spotUltimaSuma = Date.now();
    try {
      const r = await spot("/me/player/recently-played?limit=50");
      if (!r || !r.items) return;
      let hasta = datos.musica.hasta;
      r.items.forEach(function (it) {
        if (it.played_at <= datos.musica.hasta) return;
        const f = fechaATexto(new Date(it.played_at)); // la hora de Spotify viene en UTC; esto la pasa a tu día local
        datos.musica.porDia[f] = (datos.musica.porDia[f] || 0) + it.track.duration_ms;
        if (it.played_at > hasta) hasta = it.played_at;
      });
      datos.musica.hasta = hasta;
      guardar();
      renderTiempoMusica();
    } catch (e) {
      $("spot-mensaje").textContent = spotMensajeError(e);
    }
  }

  function renderTiempoMusica() {
    const ms = datos.musica.porDia[fechaActual] || 0;
    $("spot-tiempo").textContent = ms
      ? "≈ " + formatoHoras(ms / 3600000) + " de música " + (fechaActual === hoy() ? "hoy" : "este día")
      : "";
  }

  function renderMusica() {
    const conectado = spotConectado();
    $("card-musica").hidden = !conectado;
    if (!conectado) return;
    renderTiempoMusica();
    spotActualizarSonando();
    spotSumarEscuchas();
  }

  // Mientras ves la pestaña Hoy, revisa cada 20 segundos qué está sonando.
  setInterval(function () {
    if (spotConectado() && !$("tab-hoy").hidden && document.visibilityState === "visible") spotActualizarSonando();
  }, 20000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && !$("tab-hoy").hidden) renderMusica();
  });

  function renderSpotifyAjustes() {
    const s = spotLeer();
    $("spot-client-id").value = s.clientId || "";
    $("spot-redirect").textContent = spotRedirect();
    const conectado = spotConectado();
    $("spot-estado").textContent = conectado ? "✔ Conectado" : "";
    $("spot-conectar").hidden = conectado;
    $("spot-desconectar").hidden = !conectado;
    // Spotify no acepta "localhost" como dirección de regreso; hay que usar 127.0.0.1.
    const aviso = $("spot-aviso-localhost");
    aviso.hidden = location.hostname !== "localhost";
    aviso.textContent = "Spotify no acepta \"localhost\". Abre la app en " +
      location.href.replace("localhost", "127.0.0.1").split("?")[0] + " para conectar.";
  }

  $("spot-conectar").addEventListener("click", spotConectar);
  $("spot-desconectar").addEventListener("click", function () {
    if (!confirm("¿Desconectar Spotify? Tu tiempo de música guardado se queda.")) return;
    const s = spotLeer();
    spotGuardar({ clientId: s.clientId });
    renderAjustes();
  });

  // ==================== INICIO ====================
  // Si venimos de iniciar sesión en Spotify, primero termina la conexión y luego muestra la app.
  spotAlRegresar().finally(function () { mostrarTab("hoy"); });

  // El service worker permite instalar la app y usarla sin internet.
  // Solo funciona cuando la app se sirve desde https (GitHub Pages), no abriendo el archivo directo.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js");
  }
})();
