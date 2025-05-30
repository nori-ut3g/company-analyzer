' ユーザID・パスワード（「YOUR-ID」「YOUR-PASSWORD」は要変更、「"」は残すこと）
Dim UserID, Password
UserID = "akinori.nkd"
Password = "dM5KPrBXq"

' ドライブ文字列（使用していない任意のドライブに変更可能）
Dim Drive
Drive = "Z:"

' 共有フォルダ（WebDAV）設定情報
Dim WebDAV, DriveName
WebDAV = "https://secure6216m.sakura.ne.jp:9802/csvex/webdav-ex/"
DriveName = "CSVEX-WebDAV"


' 共有フォルダ（WebDAV）のマウント
Set objFSO = WScript.CreateObject("Scripting.FileSystemObject")

If objFSO.DriveExists(Drive) = False Then
	Set objNetwork = CreateObject("WScript.Network")
	objNetwork.MapNetworkDrive Drive, WebDAV, False, UserID, Password
	
	Set objShell = CreateObject("Shell.Application")
	objShell.NameSpace(Drive & "\").Self.Name = DriveName
	
	MsgBox("共有フォルダ（WebDAV）を正常にマウントしました。" & vbCr & vbCr & "【対象】" & vbCr & objShell.NameSpace(Drive & "\").Self.Name)
Else
	Set objShell = CreateObject("Shell.Application")
	MsgBox("指定されたドライブは既にマウントされています。" & vbCr & "マウント処理を中断しました。" & vbCr & "スクリプト内のドライブ文字列を変更して再度実行して下さい。" & vbCr & vbCr & "【対象】" &	vbCr & objShell.NameSpace(Drive & "\").Self.Name)
End If
