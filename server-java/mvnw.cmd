@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script
@REM ----------------------------------------------------------------------------

@IF "%__MVN_CMD__%"=="" (SET __MVN_CMD__=mvn.cmd)
@IF "%__MVNW_LAUNCHER__%"=="" (SET __MVNW_LAUNCHER__=org.apache.maven.wrapper.MavenWrapperMain)

@SETLOCAL

@SET MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
@IF NOT "%MAVEN_PROJECTBASEDIR%"=="" GOTO endDetectBaseDir

@SET EXEC_DIR=%CD%
@SET WDIR=%EXEC_DIR%
:findBaseDir
@IF EXIST "%WDIR%"\.mvn GOTO baseDirFound
@cd ..
@SET WDIR=%CD%
@IF NOT "%WDIR%"=="%EXEC_DIR%" GOTO findBaseDir
@SET WDIR=%EXEC_DIR%
:baseDirFound
@SET MAVEN_PROJECTBASEDIR=%WDIR%
@CD "%EXEC_DIR%"

:endDetectBaseDir

@IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" (
  @IF NOT "%MVNW_REPOURL%" == "" (
    @SET MVNW_REPO_URL="%MVNW_REPOURL%"
  ) ELSE (
    @SET MVNW_REPO_URL=https://repo.maven.apache.org/maven2
  )
  @FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    @IF "%%A"=="wrapperUrl" SET MVNW_WRAPPER_URL=%%B
  )
  @IF NOT "%MVNW_WRAPPER_URL%"=="" (
    @SET __MVNW_WRAPPER_URL__=%MVNW_WRAPPER_URL%
  )
  @SET MVNW_WRAPPER_JAR_PATH=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
  @IF NOT EXIST "%MVNW_WRAPPER_JAR_PATH%" (
    powershell -Command "&{"^
    "$webclient = new-object System.Net.WebClient;"^
    "if (-not ([string]::IsNullOrEmpty('%MVNW_USERNAME%') -and [string]::IsNullOrEmpty('%MVNW_PASSWORD%'))) {"^
    "$webclient.Credentials = new-object System.Net.NetworkCredential('%MVNW_USERNAME%', '%MVNW_PASSWORD%');"^
    "}"^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;"^
    "$webclient.DownloadFile('%__MVNW_WRAPPER_URL__%', '%MVNW_WRAPPER_JAR_PATH%')"^
    "}"
  )
)

@IF NOT EXIST "%JAVA_HOME%" GOTO trySystemJava
@SET JAVA_EXECUTABLE=%JAVA_HOME%\bin\java.exe
@GOTO runMaven

:trySystemJava
@FOR /F "usebackq tokens=*" %%i IN (`where java`) DO @SET JAVA_EXECUTABLE=%%i

:runMaven
@"%JAVA_EXECUTABLE%" %JVM_CONFIG_MAVEN_PROPS% %MAVEN_OPTS% %MAVEN_DEBUG_OPTS% -classpath "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %__MVNW_LAUNCHER__% %MAVEN_CONFIG% %*
@ENDLOCAL
