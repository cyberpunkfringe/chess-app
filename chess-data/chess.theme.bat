@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  MUST RUN FROM: chess-data\
REM  Scans: themes\*.json
REM  Outputs: chess.theme.json
REM ============================================================

set "THEME_DIR=themes"
set "OUTPUT=chess.theme.json"

echo.
echo ============================================
echo   Chess Theme Registry Builder
echo   Scanning %THEME_DIR%\*.json
echo ============================================
echo.

REM ============================================================
REM  START JSON ARRAY
REM ============================================================
> "%OUTPUT%" echo [

set first=1

REM ============================================================
REM  LOOP THROUGH ALL JSON FILES
REM ============================================================
for %%F in ("%THEME_DIR%\*.json") do (
    set "file=%%~nxF"

    if !first! equ 1 (
        >> "%OUTPUT%" echo   "!file!"
        set first=0
    ) else (
        >> "%OUTPUT%" echo , "!file!"
    )
)

REM ============================================================
REM  END JSON ARRAY
REM ============================================================
>> "%OUTPUT%" echo ]

echo.
echo Done!
echo Generated: %OUTPUT%
echo.

pause
