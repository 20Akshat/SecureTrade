const { spawnSync } = require('child_process');

if (process.platform === 'win32') {
    console.log("Attempting to disable console QuickEdit via powershell with stdio inherit...");
    const psCommand = `
    $code = '
    [DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int nStdHandle); 
    [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode); 
    [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
    ';
    $type = Add-Type -MemberDefinition $code -Name "Win32Utils" -Namespace "Win32" -PassThru;
    $handle = $type::GetStdHandle(-10);
    $mode = 0;
    if ($type::GetConsoleMode($handle, [ref]$mode)) {
        $mode = $mode -band -not 0x0040;
        $type::SetConsoleMode($handle, $mode);
        Write-Host "✅ QuickEdit disabled successfully!";
    } else {
        Write-Host "❌ Failed to get console mode.";
    }
    `;
    spawnSync('powershell', ['-Command', psCommand], { stdio: 'inherit' });
} else {
    console.log("Not on Windows.");
}
