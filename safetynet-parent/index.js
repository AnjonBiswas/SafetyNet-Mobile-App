// TextEncoder/TextDecoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  // Use built-in polyfill or fallback
  try {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
  } catch (e) {
    // Fallback: Use a simple implementation
    global.TextEncoder = class TextEncoder {
      encode(str) {
        const utf8 = [];
        for (let i = 0; i < str.length; i++) {
          let charcode = str.charCodeAt(i);
          if (charcode < 0x80) utf8.push(charcode);
          else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
          } else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          }
        }
        return new Uint8Array(utf8);
      }
    };
    global.TextDecoder = class TextDecoder {
      decode(bytes) {
        let result = '';
        let i = 0;
        while (i < bytes.length) {
          let c = bytes[i++];
          if (c > 127) {
            if (c > 191 && c < 224) {
              c = ((c & 31) << 6) | (bytes[i++] & 63);
            } else if (c > 223 && c < 240) {
              c = ((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
            } else {
              c = ((c & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
            }
          }
          if (c <= 0xffff) {
            result += String.fromCharCode(c);
          } else if (c <= 0x10ffff) {
            c -= 0x10000;
            result += String.fromCharCode((c >> 10) | 0xd800);
            result += String.fromCharCode((c & 0x3ff) | 0xdc00);
          }
        }
        return result;
      }
    };
  }
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
