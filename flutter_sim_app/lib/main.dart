import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const OmniFlowApp());
}

class OmniFlowApp extends StatelessWidget {
  const OmniFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniFlow CRM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D7377),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

// ────────────────────────────────────────────
// SPLASH SCREEN
// ────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _anim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200));
    _fadeAnim = CurvedAnimation(parent: _anim, curve: Curves.easeIn);
    _anim.forward();

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const DashboardScreen()));
      }
    });
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D1B2A), Color(0xFF0D7377), Color(0xFF14A085)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(Icons.phone_in_talk,
                      size: 56, color: Colors.white),
                ),
                const SizedBox(height: 24),
                const Text('OmniFlow EMS',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2)),
                const SizedBox(height: 8),
                Text('Telecalling Companion',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.7), fontSize: 16)),
                const SizedBox(height: 40),
                const CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────
// DASHBOARD SCREEN (WebView + Native Bottom Nav)
// ────────────────────────────────────────────
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _serverConnected = false;

  // ✅ Vercel Frontend (CRM Dashboard WebView)
  final String _crmUrl = "https://ems-crm-sandy.vercel.app";
  // ✅ Render Backend (API sync)
  final String _syncUrl =
      "https://ems-backend-9hig.onrender.com/api/telecalling/sync-log";

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _checkServer();
    _initWebView();
  }

  Future<void> _requestPermissions() async {
    await [
      Permission.phone,
      Permission.microphone,
      Permission.contacts,
      Permission.storage,
    ].request();
  }

  Future<void> _checkServer() async {
    // Render free tier sleeps — try waking it up (30s timeout for cold start)
    try {
      final res = await http
          .get(Uri.parse("https://ems-backend-9hig.onrender.com/"))
          .timeout(const Duration(seconds: 30));
      setState(() => _serverConnected = res.statusCode == 200);
    } catch (_) {
      setState(() => _serverConnected = false);
    }
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0D1B2A))
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() => _isLoading = true),
        onPageFinished: (_) {
          setState(() => _isLoading = false);
          // Inject mobile viewport fix
          _controller.runJavaScript('''
            var meta = document.querySelector('meta[name="viewport"]');
            if (!meta) {
              meta = document.createElement('meta');
              meta.name = 'viewport';
              document.head.appendChild(meta);
            }
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
          ''');
        },
        onWebResourceError: (e) => debugPrint("WebView error: \${e.description}"),
      ))
      ..loadRequest(Uri.parse(_crmUrl));
  }

  Future<void> _syncCall() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
          child: CircularProgressIndicator(color: Color(0xFF0D7377))),
    );

    try {
      final res = await http.post(
        Uri.parse(_syncUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "agentName": "Mobile Agent",
          "customerName": "Test Lead",
          "customerPhone": "+91 98765 12345",
          "channel": "SIM",
          "type": "OUTGOING",
          "durationSeconds": 142,
          "disposition": "Interested",
          "notes": "Real SIM call from Flutter app."
        }),
      );
      if (mounted) Navigator.pop(context);
      _showSnack(
        res.statusCode == 200
            ? '✅ Call synced to CRM!'
            : '❌ Sync failed (${res.statusCode})',
        res.statusCode == 200 ? Colors.teal : Colors.red,
      );
      if (res.statusCode == 200) _controller.reload();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      _showSnack('❌ Server offline. Start laptop server!', Colors.red);
    }
  }

  void _showSnack(String msg, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D7377),
        foregroundColor: Colors.white,
        title: Row(
          children: [
            const Icon(Icons.phone_in_talk, size: 20),
            const SizedBox(width: 8),
            const Text('OmniFlow EMS',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Spacer(),
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: _serverConnected ? Colors.greenAccent : Colors.red,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              _serverConnected ? 'Online' : 'Offline',
              style: const TextStyle(fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                _controller.reload();
                _checkServer();
              }),
        ],
      ),
      body: _serverConnected
          ? Stack(children: [
              WebViewWidget(controller: _controller),
              if (_isLoading)
                Container(
                  color: const Color(0xFF0D1B2A),
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: Color(0xFF0D7377)),
                        SizedBox(height: 16),
                        Text('Loading CRM...',
                            style: TextStyle(color: Colors.white54)),
                      ],
                    ),
                  ),
                ),
            ])
          : _offlineScreen(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _syncCall,
        backgroundColor: const Color(0xFF0D7377),
        icon: const Icon(Icons.upload_rounded, color: Colors.white),
        label: const Text('Sync Call',
            style: TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _offlineScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 72, color: Colors.red),
            const SizedBox(height: 24),
            const Text('Server Wake-up Kar Raha Hai...',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(
              'Render free server sleep ho jata hai.\n"Retry" karo — 30 seconds me connect ho jayega! ☕',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white.withOpacity(0.6), height: 1.6),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                _checkServer();
                _controller.reload();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D7377),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry Connection'),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Server Address:',
                      style: TextStyle(color: Colors.white54, fontSize: 12)),
                  SizedBox(height: 4),
                  Text('ems-backend-9hig.onrender.com',
                      style: TextStyle(
                          color: Colors.tealAccent,
                          fontFamily: 'monospace',
                          fontSize: 14)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
