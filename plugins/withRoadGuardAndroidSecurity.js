const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const marker = '// RoadGuard release signing';
const signing = `${marker}
def qaSigning = (findProperty('roadguard.qaSigning') ?: 'false').toString() == 'true'
def releaseSetting = { name -> findProperty(name) ?: System.getenv(name) }
def releaseStore = releaseSetting('ROADGUARD_UPLOAD_STORE_FILE')
def releaseStorePassword = releaseSetting('ROADGUARD_UPLOAD_STORE_PASSWORD')
def releaseAlias = releaseSetting('ROADGUARD_UPLOAD_KEY_ALIAS')
def releaseKeyPassword = releaseSetting('ROADGUARD_UPLOAD_KEY_PASSWORD')
def releaseSigningConfigured = releaseStore && releaseStorePassword && releaseAlias && releaseKeyPassword

def verifyReleaseSigning = tasks.register('verifyRoadGuardReleaseSigning') {
    doLast {
        if (!qaSigning && (!releaseSigningConfigured || !file(releaseStore).isFile())) {
            throw new GradleException('RoadGuard production release requires a keystore and all ROADGUARD_UPLOAD signing settings')
        }
    }
}
tasks.configureEach {
    if (name == 'preReleaseBuild' || name == 'validateSigningRelease') {
        dependsOn verifyReleaseSigning
    }
}
`;

function configureSigning(contents) {
  if (contents.includes(marker)) return contents;
  const buildTypes = /^    }\r?\n    buildTypes \{/m;
  const releaseBlock = /(^        release \{\r?\n)([\s\S]*?)(?=^            def enableShrinkResources)/m;
  const match = contents.match(releaseBlock);
  if (!buildTypes.test(contents) || !match || !match[2].includes('signingConfig')) {
    throw new Error('RoadGuard signing requires the Expo Android Gradle template');
  }
  const releaseConfig = /^        release \{\r?\n            def storePath = [\s\S]*?^        }\r?\n/m;
  return contents.replace(releaseConfig, '')
    .replace(releaseBlock, '$1            signingConfig qaSigning ? signingConfigs.debug : signingConfigs.release\n')
    .replace(buildTypes, `        release {
            if (!qaSigning && releaseSigningConfigured) {
                storeFile file(releaseStore)
                storePassword releaseStorePassword
                keyAlias releaseAlias
                keyPassword releaseKeyPassword
            }
        }
    }
    buildTypes {`)
    .replace(/^android \{/m, `${signing}\nandroid {`);
}

function configureManifest(manifest) {
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest).$;
  const replaced = new Set((app['tools:replace'] ?? '').split(',').map(value => value.trim()).filter(Boolean));
  for (const attr of ['android:allowBackup', 'android:fullBackupContent', 'android:dataExtractionRules']) replaced.add(attr);
  app['tools:replace'] = [...replaced].join(',');
  app['android:allowBackup'] = 'false';
  app['android:fullBackupContent'] = 'false';
  app['android:dataExtractionRules'] = '@xml/roadguard_data_extraction_rules';
  return manifest;
}

const domains = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];
const exclusions = domains.map(domain => `    <exclude domain="${domain}" path="." />`).join('\n');
const extractionRules = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${exclusions}
  </cloud-backup>
  <device-transfer>
${exclusions}
  </device-transfer>
</data-extraction-rules>
`;

module.exports = config => {
  config = withAndroidManifest(config, mod => {
    mod.modResults = configureManifest(mod.modResults);
    return mod;
  });
  config = withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') throw new Error('RoadGuard signing expects Groovy');
    mod.modResults.contents = configureSigning(mod.modResults.contents);
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'roadguard_data_extraction_rules.xml'), extractionRules);
    return mod;
  }]);
};

module.exports.configureSigning = configureSigning;
module.exports.configureManifest = configureManifest;
module.exports.extractionRules = extractionRules;
