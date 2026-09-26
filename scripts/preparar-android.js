// Ajusta el proyecto Android que genera Capacitor: permisos, íconos, versión y firma.
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const app = path.join(raiz, 'android', 'app');
const leer = f => fs.readFileSync(f, 'utf8');
const escribir = (f, t) => fs.writeFileSync(f, t);
const pkg = JSON.parse(leer(path.join(raiz, 'package.json')));

// 1) Permisos: cámara, ubicación y lectura de fotos con sus coordenadas
const manifest = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let m = leer(manifest);
const permisos = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
];
for (const p of permisos) if (!m.includes(p)) m = m.replace('</manifest>', `    ${p}\n</manifest>`);
escribir(manifest, m);

// 2) Íconos y pantalla de inicio
const copiar = (de, a) => {
  for (const x of fs.readdirSync(de)) {
    const o = path.join(de, x), d = path.join(a, x);
    if (fs.statSync(o).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copiar(o, d); }
    else fs.copyFileSync(o, d);
  }
};
copiar(path.join(raiz, 'res-app'), path.join(app, 'src', 'main', 'res'));

// 3) Versión y firma
const gradle = path.join(app, 'build.gradle');
let g = leer(gradle);
const codigo = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode \d+/, `versionCode ${codigo}`)
     .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
if (!g.includes('signingConfigs')) {
  g = g.replace(/android \{\n/, `android {
    signingConfigs {
        release {
            storeFile file('llave.jks')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
            keyAlias 'obraelectrica'
            keyPassword System.getenv('KEYSTORE_PASSWORD') ?: ''
        }
    }
`);
  g = g.replace(/release \{\n(\s*)minifyEnabled false/, `release {\n$1if (file('llave.jks').exists()) { signingConfig signingConfigs.release }\n$1minifyEnabled false`);
}
escribir(gradle, g);
console.log(`Android listo: versión ${pkg.version} (${codigo})`);
