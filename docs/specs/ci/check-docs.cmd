@echo off
setlocal
pushd "%~dp0.."
if errorlevel 1 exit /b 1
python 09_Frontend\contracts\check_contracts.py
if errorlevel 1 goto failed
python 09_Frontend\contracts\validate_package.py
if errorlevel 1 goto failed
python ci\test_contract_guard.py
if errorlevel 1 goto failed
popd
exit /b 0
:failed
popd
exit /b 1
