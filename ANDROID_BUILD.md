# Lumen Society — Android Demo (v0.5)

Este projeto contém um wrapper Android nativo simples com WebView. A interface web é empacotada em `android/app/src/main/assets/www` e o build Android ativa `LUMEN_DEMO_MODE`, que mantém um estado de demonstração local no app. Ele não sincroniza com o backend web nem representa a simulação online persistente.

## Gerar APK

### GitHub Actions (mais simples)

1. Envie o conteúdo deste projeto para um repositório GitHub.
2. Abra a aba **Actions** do repositório.
3. Execute **Build Lumen Society Android APK** em **Run workflow** (ou faça push de alterações nas pastas monitoradas).
4. Quando terminar, abra a execução e baixe o artefato `lumen-society-demo-apk`.
5. Extraia o ZIP do artefato e instale `app-debug.apk` no Android. Se solicitado, permita instalação dessa fonte.

### Android Studio

1. Abra a pasta `android` no Android Studio.
2. Aguarde o Gradle sincronizar e instalar as dependências.
3. Selecione **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. O APK de depuração será criado em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Requisitos

- Android Studio com Android SDK Platform 35, Build Tools 35.0.0 e JDK 17; ou GitHub Actions.
- Conexão com a internet no aparelho para carregar Three.js 0.170.0 pelo CDN.
- Android 6.0 (API 23) ou superior.

## Limitações desta demo

- O estado do morador é simulado localmente no WebView e reinicia quando o app é encerrado; não é a persistência autoritativa do servidor.
- Não há login, multiplayer, bot Discord nem sincronização entre dispositivos.
- O APK é de depuração, não assinado para distribuição na Play Store.
