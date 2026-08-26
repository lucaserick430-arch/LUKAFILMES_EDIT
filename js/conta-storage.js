/* ============================================================
   LUKAFILMES — STORAGE ISOLADO POR CONTA
   Minha Lista + Favoritos + Continuar Assistindo
   ============================================================ */
(function(){

    const CHAVES_ISOLADAS = [
        "lukafilmes_minhalista",
        "lukafilmes_continuar",
        "lukafilmes_continuar_assistindo",
        "continuarAssistindo",
        "continuar_assistindo",
        "filmesContinuarAssistindo",
        "seriesContinuarAssistindo",
        "historicoAssistindo",
        "historico_assistindo",
        "historicoFilmes",
        "historicoSeries"
    ];

    const PREFIXO = "lukafilmes_conta_";

    const getOriginal = Storage.prototype.getItem;
    const setOriginal = Storage.prototype.setItem;
    const removeOriginal = Storage.prototype.removeItem;
    const keyOriginal = Storage.prototype.key;

    let contaPronta = false;
    let chaveConta = null;
    const pendentes = [];

    let resolverConta;
    window.LukaContaPronta = new Promise(function(resolve){
        resolverConta = resolve;
    });

    window.LukaContaAtual = function(){
        return chaveConta;
    };

    function ehChaveIsolada(chave){
        if(!chave) return false;
        return CHAVES_ISOLADAS.includes(String(chave));
    }

    function normalizarId(valor){
        return String(valor || "")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function chaveFinal(chave){
        if(!ehChaveIsolada(chave)) return chave;
        if(!chaveConta) return null;
        return PREFIXO + chaveConta + "_" + chave;
    }

    function executarPendentes(){
        if(!contaPronta) return;

        while(pendentes.length){
            const item = pendentes.shift();

            try{
                if(item.tipo === "set"){
                    setOriginal.call(
                        localStorage,
                        chaveFinal(item.chave),
                        item.valor
                    );
                }

                if(item.tipo === "remove"){
                    removeOriginal.call(
                        localStorage,
                        chaveFinal(item.chave)
                    );
                }
            }catch(e){}
        }
    }

    Storage.prototype.getItem = function(chave){
        if(!ehChaveIsolada(chave)){
            return getOriginal.call(this, chave);
        }

        if(!contaPronta){
            return null;
        }

        const final = chaveFinal(chave);

        if(!final){
            return null;
        }

        return getOriginal.call(this, final);
    };

    Storage.prototype.setItem = function(chave, valor){
        if(!ehChaveIsolada(chave)){
            return setOriginal.call(this, chave, valor);
        }

        if(!contaPronta){
            pendentes.push({
                tipo: "set",
                chave: chave,
                valor: String(valor)
            });
            return;
        }

        const final = chaveFinal(chave);

        if(final){
            return setOriginal.call(this, final, String(valor));
        }
    };

    Storage.prototype.removeItem = function(chave){
        if(!ehChaveIsolada(chave)){
            return removeOriginal.call(this, chave);
        }

        if(!contaPronta){
            pendentes.push({
                tipo: "remove",
                chave: chave
            });
            return;
        }

        const final = chaveFinal(chave);

        if(final){
            return removeOriginal.call(this, final);
        }
    };

    /*
       O acesso ao /api/eu identifica a sessão real do usuário.
       Enquanto isso não acontece, as chaves protegidas retornam null.
       Portanto uma conta nova nunca recebe os dados antigos do ADM.
    */
    fetch("/api/eu", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
    })
    .then(function(res){
        if(!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
    })
    .then(function(data){

        const usuario = data && (
            data.usuario ||
            data.user ||
            data
        );

        const id =
            usuario &&
            (
                usuario.id ||
                usuario.usuario ||
                usuario.username
            );

        if(!id){
            chaveConta = "sem_conta";
        }else{
            chaveConta = normalizarId(id);
        }

        /*
           Se a sessão atual for ADMIN e ainda existir a antiga
           chave global, preservamos os dados antigos do ADM.
           Usuários comuns NÃO recebem essa migração.
        */
        const tipo = String(
            usuario && (
                usuario.tipo ||
                usuario.role ||
                ""
            )
        ).toLowerCase();

        if(tipo === "admin"){

            CHAVES_ISOLADAS.forEach(function(chave){

                const antigo = getOriginal.call(
                    localStorage,
                    chave
                );

                const novo = PREFIXO + chaveConta + "_" + chave;

                if(
                    antigo !== null &&
                    getOriginal.call(localStorage, novo) === null
                ){
                    setOriginal.call(
                        localStorage,
                        novo,
                        antigo
                    );
                }

                if(antigo !== null){
                    removeOriginal.call(
                        localStorage,
                        chave
                    );
                }
            });
        }

        contaPronta = true;

        executarPendentes();

        window.dispatchEvent(new CustomEvent("lukafilmes:conta-pronta", {
            detail: {
                id: chaveConta,
                tipo: tipo || "usuario"
            }
        }));

        if(resolverConta){
            resolverConta({
                id: chaveConta,
                tipo: tipo || "usuario"
            });
        }

        console.log(
            "[CONTA STORAGE] CONTA ISOLADA:",
            chaveConta,
            "| TIPO:",
            tipo || "usuario"
        );
    })
    .catch(function(erro){

        /*
           Em caso de falha na identificação da sessão,
           NÃO usar dados globais.
        */
        chaveConta = "sem_conta";
        contaPronta = true;

        executarPendentes();

        window.dispatchEvent(new CustomEvent("lukafilmes:conta-pronta", {
            detail: {
                id: chaveConta,
                tipo: "sem_conta"
            }
        }));

        if(resolverConta){
            resolverConta({
                id: chaveConta,
                tipo: "sem_conta"
            });
        }

        console.warn(
            "[CONTA STORAGE] Sessão não identificada. Dados isolados.",
            erro
        );
    });

})();
