' オブジェクト初期化
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
set objHttp = CreateObject("MSXML2.XMLHTTP")


' 共有フォルダのドライブ文字列（変更可能）
' 「Z:」は mount_CSVEX-WebDAV.vbs の中で設定したドライブ文字列と必ず揃えること
Dim Drive
Drive = "Z:"

' 同期元の共有フォルダ（変更可能）
' 「Z:」は mount_CSVEX-WebDAV.vbs の中で設定したドライブ文字列と必ず揃えること
Dim SourceFolder
SourceFolder = "Z:\kabu.plus\csv"

' 同期先のローカルフォルダ（変更可能）
' デフォルトはMyDocument配下に「CSVEX-Local」フォルダを作成して同期先とする
Dim MyDoc, DestFolder
MyDoc = objShell.SpecialFolders("mydocuments")
DestFolder = "D:\CSVEX-Local"


' 同期の対象外とするフォルダ（設定可能）
Dim ExcludedFolders
ExcludedFolders = ""

' 以下、同期の対象外とするフォルダは行頭の「' 」を削除する
' ここで指定したフォルダ配下は全て同期の対象外となる

' 対象外フォルダ：code（個別銘柄 時系列データ）
ExcludedFolders = ExcludedFolders & " /XD " & "code"

' 対象外フォルダ：japan-all-stock-prices（株価一覧表）
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-prices"

' 対象外フォルダ：japan-all-stock-prices-2（株価一覧表（詳細フォーマット））
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-prices-2"

' 対象外フォルダ：tosho-stock-ohlc（株価四本値データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-stock-ohlc"

' 対象外フォルダ：tosho-etf-stock-prices（ETF・ETN 株価一覧表）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-etf-stock-prices"

' 対象外フォルダ：tosho-etf-ohlc（ETF・ETN 株価四本値データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-etf-ohlc"

' 対象外フォルダ：tosho-reit-stock-prices（REIT 株価一覧表）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-reit-stock-prices"

' 対象外フォルダ：tosho-reit-ohlc（REIT 株価四本値データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-reit-ohlc"

' 対象外フォルダ：tosho-fund-and-others-stock-prices（ファンド・他 株価一覧表）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-fund-and-others-stock-prices"

' 対象外フォルダ：tosho-fund-and-others-ohlc（ファンド・他 株価四本値データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-fund-and-others-ohlc"

' 対象外フォルダ：japan-all-stock-data（投資指標データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-data"

' 対象外フォルダ：japan-all-stock-financial-results（決算・財務・業績データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-financial-results"

' 対象外フォルダ：japan-all-stock-margin-transactions（信用取引残高データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-margin-transactions"

' 対象外フォルダ：tosho-etf-margin-transactions（ETF・ETN 信用取引残高データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-etf-margin-transactions"

' 対象外フォルダ：tosho-reit-margin-transactions（REIT 信用取引残高データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-reit-margin-transactions"

' 対象外フォルダ：tosho-fund-and-others-margin-transactions（ファンド・他 信用取引残高データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-fund-and-others-margin-transactions"

' 対象外フォルダ：tosho-stock-margin-transactions-2（信用取引残高明細データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-stock-margin-transactions-2"

' 対象外フォルダ：tosho-etf-margin-transactions-2（ETF・ETN 信用取引残高明細データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-etf-margin-transactions-2"

' 対象外フォルダ：tosho-reit-margin-transactions-2（REIT 信用取引残高明細データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-reit-margin-transactions-2"

' 対象外フォルダ：tosho-fund-and-others-margin-transactions-2（ファンド・他 信用取引残高明細データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-fund-and-others-margin-transactions-2"

' 対象外フォルダ：jsf-balance-data（日証金 融資・貸株残高データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "jsf-balance-data"

' 対象外フォルダ：jsf-gyakuhibu-data（日証金 逆日歩銘柄一覧データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "jsf-gyakuhibu-data"

' 対象外フォルダ：japan-all-stock-information（銘柄基本データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "japan-all-stock-information"

' 対象外フォルダ：japan-all-stock-information（株価指数データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "tosho-index-data"

' 対象外フォルダ：trademark-publication（商標出願データ）
' ExcludedFolders = ExcludedFolders & " /XD " & "trademark-publication"

' 対象外フォルダ：★（追加設定用）
' ExcludedFolders = ExcludedFolders & " /XD " & "★"



' 以降の処理は変更不可

' OSバージョン判定
Dim SyncCmd
If (GetOSVersion() = "6.1") or (GetOSVersion() = "6.2") or (GetOSVersion() = "6.3") Then
	SyncCmd = "robocopy"
Else
	If objFSO.FileExists("robocopy\Robocopy.exe") = True Then
		SyncCmd = "robocopy\Robocopy.exe"
	Else
		MsgBox("フォルダ内に「robocopy」フォルダが存在しません。" & vbCr & "同期処理を中断しました。" & vbCr & "スクリプトファイルの配置先を変更する場合は、必ず「robocopy」フォルダと共に移動して下さい。")
		WScript.Quit
	End If
End If

' 共有フォルダからローカルフォルダへの同期処理
objHttp.Open "GET", "https://csvex.com/status/webdav-ex", false
objHttp.Send
If objHttp.ResponseText = "OK" Then
	If objFSO.DriveExists(Drive) = True Then
		objShell.Run "cmd /c (" & SyncCmd & " """ & SourceFolder & """ """ & DestFolder & """ /E" & ExcludedFolders & " /COPY:DAT /DCOPY:T /R:5 /W:2 /IPG:0 /LOG:robocopy.log /TEE)", 1, true
		
		MsgBox("共有フォルダ（WebDAV）からローカルフォルダへの同期処理が終了しました。" & vbCr & vbCr & "【同期先】" & vbCr & DestFolder)
	Else
		MsgBox("共有フォルダ（WebDAV）がマウントされていません。" & vbCr & "同期処理を中断しました。" & vbCr & "共有フォルダをマウントしてから再度実行して下さい。")
	End If
Else
	MsgBox("現在、共有フォルダ（WebDAV）が正常に動作していません。" & vbCr & "同期処理を中断しました。" & vbCr & "時間を置いてから再度実行して下さい。")
End If


' OSバージョン取得関数
Function GetOSVersion()
	Dim obj, colTarget, objRow, str, aData, nData, I
	
	Set obj = GetObject("winmgmts:\\.\root\cimv2")
	Set colTarget = obj.ExecQuery("select * from Win32_OperatingSystem")
	
	For Each objRow in colTarget
		str = objRow.Version
	Next
	
	aData = Split(str, ".")
	
	For I = 0 to Ubound(aData)
		if I > 1 then
			Exit For
		end if
		if I > 0 then
			nTarget = nTarget & "."
		end if
		nTarget = nTarget & aData(I)
	Next
	
	GetOSVersion = CDbl(nTarget)
End Function
