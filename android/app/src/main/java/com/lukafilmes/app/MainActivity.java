package com.lukafilmes.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView webView;
    private FrameLayout rootLayout;

    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    // Estado original da janela antes de entrar no fullscreen
    private int systemUiVisibilityOriginal = View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
    private boolean fullscreenAtivo = false;
    private int fullscreenWidthOriginal = -1;
    private int fullscreenHeightOriginal = -1;

    private static final String SITE_PRINCIPAL =
            "lukafilmes.onrender.com";

    private static final String URL_INICIAL =
            "https://lukafilmes.onrender.com";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        criarInterface();

        /*
         * Na rotação normal o Android não recria esta Activity,
         * pois o Manifest possui configChanges.
         *
         * Caso exista uma recriação real da Activity, restauramos
         * o estado anterior do WebView.
         */
        if (savedInstanceState != null) {

            Bundle estadoWebView =
                    savedInstanceState.getBundle("LUKAFILMES_WEBVIEW_STATE");

            if (estadoWebView != null) {
                webView.restoreState(estadoWebView);
            } else {
                webView.loadUrl(URL_INICIAL);
            }

        } else {

            if (verificarIdentidadeLukafilmes()) {
                webView.loadUrl(URL_INICIAL);
            }
        }
    }

    private boolean verificarIdentidadeLukafilmes() {

        final String PACKAGE_OFICIAL = "com.lukafilmes.app";
        final String CERTIFICADO_SHA256 =
                "fcbca30bdc1eb4173e0d94d3d9cfa74ddc61ac204aab2768f70c370b14a8c572";

        try {

            if (!getPackageName().equals(PACKAGE_OFICIAL)) {
                mostrarFalhaIdentidade("Pacote do aplicativo não reconhecido.");
                return false;
            }

            PackageManager pm = getPackageManager();

            PackageInfo info;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {

                info = pm.getPackageInfo(
                        getPackageName(),
                        PackageManager.GET_SIGNING_CERTIFICATES
                );

                if (info.signingInfo == null) {
                    mostrarFalhaIdentidade("Assinatura do aplicativo não encontrada.");
                    return false;
                }

                Signature[] assinaturas =
                        info.signingInfo.hasMultipleSigners()
                                ? info.signingInfo.getApkContentsSigners()
                                : info.signingInfo.getSigningCertificateHistory();

                if (assinaturas == null || assinaturas.length == 0) {
                    mostrarFalhaIdentidade("Certificado do aplicativo não encontrado.");
                    return false;
                }

                boolean certificadoValido = false;

                for (Signature assinatura : assinaturas) {

                    byte[] certificado =
                            assinatura.toByteArray();

                    java.security.MessageDigest digest =
                            java.security.MessageDigest.getInstance("SHA-256");

                    byte[] hash = digest.digest(certificado);

                    StringBuilder hex = new StringBuilder();

                    for (byte b : hash) {
                        hex.append(String.format("%02x", b));
                    }

                    if (CERTIFICADO_SHA256.equalsIgnoreCase(hex.toString())) {
                        certificadoValido = true;
                        break;
                    }
                }

                if (!certificadoValido) {
                    mostrarFalhaIdentidade(
                            "A assinatura desta APK não corresponde ao LUKAFILMES oficial."
                    );
                    return false;
                }

            } else {

                info = pm.getPackageInfo(
                        getPackageName(),
                        PackageManager.GET_SIGNATURES
                );

                if (info.signatures == null || info.signatures.length == 0) {
                    mostrarFalhaIdentidade("Certificado do aplicativo não encontrado.");
                    return false;
                }

                boolean certificadoValido = false;

                for (Signature assinatura : info.signatures) {

                    byte[] certificado =
                            assinatura.toByteArray();

                    java.security.MessageDigest digest =
                            java.security.MessageDigest.getInstance("SHA-256");

                    byte[] hash = digest.digest(certificado);

                    StringBuilder hex = new StringBuilder();

                    for (byte b : hash) {
                        hex.append(String.format("%02x", b));
                    }

                    if (CERTIFICADO_SHA256.equalsIgnoreCase(hex.toString())) {
                        certificadoValido = true;
                        break;
                    }
                }

                if (!certificadoValido) {
                    mostrarFalhaIdentidade(
                            "A assinatura desta APK não corresponde ao LUKAFILMES oficial."
                    );
                    return false;
                }
            }

            Toast.makeText(
                    this,
                    "APK oficial LUKAFILMES verificada.",
                    Toast.LENGTH_SHORT
            ).show();

            return true;

        } catch (Exception e) {

            mostrarFalhaIdentidade(
                    "Não foi possível verificar a identidade da APK."
            );

            return false;
        }
    }

    private void mostrarFalhaIdentidade(String mensagem) {

        new android.app.AlertDialog.Builder(this)
                .setTitle("LUKAFILMES")
                .setMessage(
                        "VERIFICAÇÃO DA APK\n\n"
                                + mensagem
                                + "\n\nO aplicativo não será iniciado."
                )
                .setCancelable(false)
                .setPositiveButton("FECHAR", (dialog, which) -> finish())
                .show();
    }

    private void criarInterface() {

        rootLayout = new FrameLayout(this);

        webView = new WebView(this);

        rootLayout.addView(
                webView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        setContentView(rootLayout);

        configurarWebView();
        configurarNavegacao();
        configurarChrome();
    }

    private void configurarWebView() {

        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        settings.setMediaPlaybackRequiresUserGesture(false);

        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        /*
         * Não forçamos User-Agent.
         *
         * Portanto:
         * celular retrato -> site mobile
         * celular paisagem -> site mobile responsivo
         * PC -> site PC
         * TV/TV Box -> site identifica o ambiente
         */

        webView.setSaveEnabled(true);

        CookieManager cookieManager =
                CookieManager.getInstance();

        cookieManager.setAcceptCookie(true);

        cookieManager.setAcceptThirdPartyCookies(
                webView,
                true
        );
    }

    private void configurarNavegacao() {

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request) {

                /*
                 * Iframes dos players e anúncios internos continuam
                 * sendo tratados normalmente pelo WebView.
                 */
                if (!request.isForMainFrame()) {
                    return false;
                }

                Uri uri = request.getUrl();

                if (uri == null) {
                    return false;
                }

                String host = uri.getHost();

                if (host == null) {
                    return false;
                }

                /*
                 * Navegação interna do LUKAFILMES.
                 */
                if (host.equalsIgnoreCase(SITE_PRINCIPAL)
                        || host.endsWith("." + SITE_PRINCIPAL)) {

                    return false;
                }

                /*
                 * Navegação externa do frame principal.
                 *
                 * O conteúdo externo é aberto fora do WebView.
                 * Ao retornar para o aplicativo, o WebView continua
                 * no estado anterior.
                 */
                try {

                    Intent intent =
                            new Intent(
                                    Intent.ACTION_VIEW,
                                    uri
                            );

                    startActivity(intent);

                    return true;

                } catch (Exception e) {

                    Toast.makeText(
                            MainActivity.this,
                            "Não foi possível abrir o conteúdo externo.",
                            Toast.LENGTH_SHORT
                    ).show();

                    return true;
                }
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error) {

                if (request.isForMainFrame()) {

                    Toast.makeText(
                            MainActivity.this,
                            "Erro ao carregar LUKAFILMES: "
                                    + error.getDescription(),
                            Toast.LENGTH_LONG
                    ).show();
                }
            }
        });
    }

    private void configurarChrome() {

        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onShowCustomView(
                    View view,
                    CustomViewCallback callback) {

                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                fullscreenView = view;
                fullscreenCallback = callback;
                fullscreenAtivo = true;

                systemUiVisibilityOriginal =
                        getWindow().getDecorView().getSystemUiVisibility();

                webView.setVisibility(View.GONE);

                rootLayout.addView(
                        fullscreenView,
                        new FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT
                        )
                );

                getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_FULLSCREEN,
                        WindowManager.LayoutParams.FLAG_FULLSCREEN
                );

                aplicarModoFullscreen();
            }

            @Override
            public void onHideCustomView() {
                sairDoFullscreen();
            }
        });
    }

    private void aplicarModoFullscreen() {

        getWindow()
                .getDecorView()
                .setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
    }

    private void sairDoFullscreen() {

        if (fullscreenView == null) {
            return;
        }

        rootLayout.removeView(fullscreenView);

        fullscreenView = null;

        if (fullscreenCallback != null) {

            fullscreenCallback.onCustomViewHidden();
            fullscreenCallback = null;
        }

        webView.setVisibility(View.VISIBLE);

        getWindow().clearFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        fullscreenAtivo = false;

        // Restaura exatamente o estado da interface anterior ao fullscreen.
        getWindow()
                .getDecorView()
                .setSystemUiVisibility(systemUiVisibilityOriginal);

        // Força o WebView a recalcular o espaço disponível depois do fullscreen.
        webView.requestLayout();
        webView.post(() -> {
            webView.requestLayout();
            webView.invalidate();
        });
    }

    /*
     * A rotação não executa loadUrl().
     *
     * O WebView permanece exatamente na página/filme/player
     * que estava aberto.
     */
    @Override
    public void onConfigurationChanged(Configuration newConfig) {

        super.onConfigurationChanged(newConfig);

        /*
         * Não recarregar a página.
         * Não voltar para a Home.
         * Não trocar User-Agent.
         *
         * Apenas deixamos o WebView se adaptar ao novo tamanho.
         */
        if (fullscreenView != null) {
            aplicarModoFullscreen();
        }
    }

    /*
     * Guarda o estado do WebView para uma eventual recriação
     * verdadeira da Activity.
     */
    @Override
    protected void onSaveInstanceState(Bundle outState) {

        Bundle estadoWebView = new Bundle();

        if (webView != null) {
            webView.saveState(estadoWebView);
        }

        outState.putBundle(
                "LUKAFILMES_WEBVIEW_STATE",
                estadoWebView
        );

        super.onSaveInstanceState(outState);
    }

    /*
     * NÃO fazemos loadUrl() no onResume().
     *
     * Assim, se um anúncio externo abrir outro aplicativo/navegador,
     * ao retornar o filme continua onde estava.
     */
    @Override
    protected void onResume() {

        super.onResume();

        if (fullscreenView != null) {
            aplicarModoFullscreen();
        }
    }

    @Override
    public void onBackPressed() {

        if (fullscreenView != null) {

            sairDoFullscreen();
            return;
        }

        if (webView != null && webView.canGoBack()) {

            webView.goBack();
            return;
        }

        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {

        if (fullscreenView != null) {
            sairDoFullscreen();
        }

        if (webView != null) {

            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();

            webView = null;
        }

        super.onDestroy();
    }
}
