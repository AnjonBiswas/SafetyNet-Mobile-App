# PowerShell script to start Expo with EXPO_NO_SHIM=1
$env:EXPO_NO_SHIM = "1"
npx expo start --clear
