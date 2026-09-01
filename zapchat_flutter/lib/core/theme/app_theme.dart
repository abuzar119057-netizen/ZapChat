import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  // ─── Core Colors (matching index.css) ───────────────────────────────────────
  static const Color primary = Color(0xFF007AFF);
  static const Color primaryDark = Color(0xFF004FB3);

  // Dark Theme (default)
  static const Color bgDark = Color(0xFF0B141A);
  static const Color bgDarkLight = Color(0xFF1C272E);
  static const Color bgChatDark = Color(0xFF0B141A);
  static const Color textMainDark = Color(0xFFD1D7DB);
  static const Color textMutedDark = Color(0xFF8696A0);
  static const Color borderDark = Color(0x0DFFFFFF); // rgba(255,255,255,0.05)

  static const Color bubbleSentDark = Color(0xFF005C4B);
  static const Color bubbleReceivedDark = Color(0xFF202C33);
  static const Color bubbleTextSentDark = Color(0xFFE9EDEF);
  static const Color bubbleTextReceivedDark = Color(0xFFE9EDEF);

  // Light Theme
  static const Color bgLight = Color(0xFFFFFFFF);
  static const Color bgLightSecondary = Color(0xFFF2F2F7);
  static const Color bgChatLight = Color(0xFFE5DDD5);
  static const Color textMainLight = Color(0xFF000000);
  static const Color textMutedLight = Color(0xFF8E8E93);
  static const Color borderLight = Color(0xFFC6C6C8);

  static const Color bubbleSentLight = Color(0xFFDCF8C6);
  static const Color bubbleReceivedLight = Color(0xFFFFFFFF);
  static const Color bubbleTextSentLight = Color(0xFF000000);
  static const Color bubbleTextReceivedLight = Color(0xFF000000);

  // Status colors
  static const Color online = Color(0xFF34C759);
  static const Color decline = Color(0xFFFF3B30);
  static const Color accept = Color(0xFF007AFF);

  // ─── Dark Theme ─────────────────────────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDark,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        surface: bgDark,
        surfaceContainerHighest: bgDarkLight,
        onSurface: textMainDark,
        onSurfaceVariant: textMutedDark,
        outline: borderDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgDark,
        foregroundColor: textMainDark,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
          color: textMainDark,
        ),
      ),
      listTileTheme: const ListTileThemeData(
        tileColor: Colors.transparent,
        iconColor: textMutedDark,
      ),
      dividerColor: borderDark,
      dividerTheme: const DividerThemeData(
        color: borderDark,
        thickness: 0.5,
        space: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgDarkLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMutedDark, fontSize: 16),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          minimumSize: const Size(double.infinity, 50),
          textStyle: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
        ),
      ),
      iconTheme: const IconThemeData(color: textMutedDark, size: 24),
      fontFamily: 'SF Pro Text',
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: textMainDark, fontSize: 16),
        bodyMedium: TextStyle(color: textMainDark, fontSize: 14),
        bodySmall: TextStyle(color: textMutedDark, fontSize: 12),
        titleLarge: TextStyle(color: textMainDark, fontSize: 22, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: textMainDark, fontSize: 17, fontWeight: FontWeight.w600),
        titleSmall: TextStyle(color: textMutedDark, fontSize: 13),
        labelSmall: TextStyle(color: textMutedDark, fontSize: 11),
      ),
    );
  }

  // ─── Light Theme ────────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgLight,
      primaryColor: primary,
      colorScheme: const ColorScheme.light(
        primary: primary,
        surface: bgLight,
        surfaceContainerHighest: bgLightSecondary,
        onSurface: textMainLight,
        onSurfaceVariant: textMutedLight,
        outline: borderLight,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgLight,
        foregroundColor: textMainLight,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
          color: textMainLight,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFEBEBEB),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMutedLight, fontSize: 16),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          minimumSize: const Size(double.infinity, 50),
        ),
      ),
      fontFamily: 'SF Pro Text',
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: textMainLight, fontSize: 16),
        bodyMedium: TextStyle(color: textMainLight, fontSize: 14),
        bodySmall: TextStyle(color: textMutedLight, fontSize: 12),
        titleLarge: TextStyle(color: textMainLight, fontSize: 22, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: textMainLight, fontSize: 17, fontWeight: FontWeight.w600),
      ),
    );
  }
}
