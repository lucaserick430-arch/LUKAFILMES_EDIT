/* ============================================================
   LUKAFILMES — CONTINUAR ASSISTINDO
   ISOLADO POR CONTA
   ============================================================ */

const CHAVE_CONTINUAR = "lukafilmes_continuar";

function lerContinuar(){
  try{
    const lista = JSON.parse(
      localStorage.getItem(CHAVE_CONTINUAR) || "[]"
    );

    return Array.isArray(lista) ? lista : [];
  }catch(e){
    console.warn("[CONTINUAR] Erro ao ler:", e);
    return [];
  }
}

function salvarContinuar(item){
  if(!item || !item.id) return;

  const lista = lerContinuar()
    .filter(x =>
      String(x.id) !== String(item.id) ||
      String(x.tipo || "filme") !== String(item.tipo || "filme")
    );

  lista.unshift(item);

  localStorage.setItem(
    CHAVE_CONTINUAR,
    JSON.stringify(lista.slice(0,24))
  );
}

function removerContinuar(id, tipo){
  const lista = lerContinuar().filter(function(item){
    return !(
      String(item.id) === String(id) &&
      String(item.tipo || "filme") === String(tipo || "filme")
    );
  });

  localStorage.setItem(
    CHAVE_CONTINUAR,
    JSON.stringify(lista)
  );

  return lista;
}

function obterContinuar(){
  return lerContinuar();
}

/* ============================================================
   REGISTRAR INICIO DO CONTEUDO
   Usado quando o player externo e carregado.
   Mantem varios filmes/series no Continuar Assistindo.
   ============================================================ */

function registrarInicio(dados){

  if(!dados || !dados.id) return;

  const tipo =
    dados.tipo || "filme";

  const anterior =
    obterContinuar().find(function(item){
      return (
        String(item.id) === String(dados.id) &&
        String(item.tipo || "filme") === String(tipo)
      );
    });

  salvarContinuar({
    id: dados.id,
    titulo: dados.titulo || "Conteudo",
    capa: dados.capa || "",
    tipo: tipo,

    /* Preserva eventual progresso ja salvo */
    tempo: anterior ? Number(anterior.tempo) || 0 : 0,
    duracao: anterior ? Number(anterior.duracao) || 0 : 0,
    progresso: anterior ? Number(anterior.progresso) || 0 : 0,

    /* Player externo utilizado */
    player: dados.player || anterior?.player || null
  });

  document.dispatchEvent(
    new CustomEvent("lukafilmes:continuar-alterado")
  );
}

function conectarPlayer(video, dados){
  if(!video) return;

  video.addEventListener("timeupdate", () => {

    salvarContinuar({
      id: dados.id,
      titulo: dados.titulo,
      capa: dados.capa,
      tipo: dados.tipo || "filme",
      tempo: video.currentTime,
      duracao: video.duration || 0,
      progresso:
        video.duration
          ? (video.currentTime / video.duration) * 100
          : 0
    });

  });

  const salvo = obterContinuar().find(x =>
    String(x.id) === String(dados.id) &&
    String(x.tipo || "filme") === String(dados.tipo || "filme")
  );

  if(salvo && salvo.tempo > 15){

    const ok = confirm("Continuar de onde parou?");

    if(ok){
      video.currentTime = salvo.tempo;
    }
  }
}

function renderContinuar(idContainer){

  const c = document.getElementById(idContainer);

  if(!c) return;

  const lista = obterContinuar();

  if(!lista.length){
    c.style.display = "none";
    return;
  }

  c.style.display = "flex";

  c.innerHTML = lista.map(function(i){

    const dados =
      encodeURIComponent(
        JSON.stringify(i)
      );

    return `
      <div
        style="
          width:170px;
          min-width:170px;
          position:relative;
          color:white;
          flex-shrink:0;
        "
      >

        <img
          src="${i.capa || ""}"
          alt="${i.titulo || "Conteúdo"}"
          draggable="false"
          style="
            display:block;
            width:170px;
            height:255px;
            object-fit:cover;
            border-radius:10px;
            user-select:none;
            -webkit-user-select:none;
          "
        >

        <button
          type="button"
          onclick="LukaContinuar.abrirPorDados('${dados}')"
          style="
            display:block;
            width:calc(100% - 20px);
            margin:8px 10px 0;
            padding:11px 6px;
            border:0;
            border-radius:7px;
            background:#e50914;
            color:#fff;
            text-align:center;
            font-size:14px;
            font-weight:700;
            line-height:1.2;
            cursor:pointer;
            touch-action:manipulation;
            -webkit-tap-highlight-color:transparent;
          "
        >▶ Continuar</button>

        <button
          type="button"
          onclick="LukaContinuar.remover('${String(i.id).replace(/'/g,"\\'")}','${String(i.tipo || "filme").replace(/'/g,"\\'")}')"
          style="
            display:block;
            width:calc(100% - 20px);
            margin:6px 10px 0;
            padding:9px 6px;
            border:1px solid #555;
            border-radius:7px;
            background:#222;
            color:#fff;
            text-align:center;
            font-size:13px;
            font-weight:700;
            cursor:pointer;
            touch-action:manipulation;
            -webkit-tap-highlight-color:transparent;
          "
        >🗑 Remover</button>

        <div
          style="
            height:4px;
            background:#333;
            border-radius:4px;
            overflow:hidden;
            margin:7px 10px 0;
          "
        >
          <div
            style="
              width:${Math.min(100, Number(i.progresso) || 0)}%;
              height:100%;
              background:#e50914;
            "
          ></div>
        </div>

        <div
          style="
            font-size:14px;
            margin:8px 10px 0;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            user-select:none;
            -webkit-user-select:none;
          "
        >${i.titulo || "Conteúdo"}</div>

      </div>
    `;
  }).join("");
}

function remover(id, tipo){
  removerContinuar(id, tipo);

  document.dispatchEvent(
    new CustomEvent("lukafilmes:continuar-alterado")
  );

  document.querySelectorAll(
    "[id*='continuar'], [id*='Continuar']"
  ).forEach(function(el){

    if(
      el.id &&
      (
        el.id === "continuarAssistindoLista" ||
        el.id === "listaContinuar"
      )
    ){
      renderContinuar(el.id);
    }
  });
}

function abrirPorDados(dados){
  try{
    const item =
      JSON.parse(
        decodeURIComponent(dados)
      );

    if(!item){
      console.warn("[CONTINUAR] Item inválido");
      return;
    }

    abrir(item);

  }catch(erro){
    console.error(
      "[CONTINUAR] Erro ao abrir:",
      erro
    );
  }
}

function abrir(item){

  if(!item || !item.id) return;

  try{

    localStorage.setItem(
      "filmeSelecionadoHome_" + String(item.id),
      JSON.stringify(item)
    );

    localStorage.setItem(
      "filmeSelecionado",
      JSON.stringify(item)
    );

  }catch(e){

    console.warn(
      "[CONTINUAR] Erro ao preparar filme:",
      e
    );
  }

  const pagina =
    item.tipo === "serie"
      ? "/paginas/serie.html"
      : "/paginas/filme.html";

  window.location.href =
    pagina +
    "?id=" +
    encodeURIComponent(item.id);
}

window.LukaContinuar = {
  conectarPlayer,
  registrarInicio,
  renderContinuar,
  abrir,
  abrirPorDados,
  remover,
  removerContinuar,
  obterContinuar
};
