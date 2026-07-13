import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorSchemeSeed: const Color(AppColors.primary),
      scaffoldBackgroundColor: const Color(AppColors.background),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0.5,
        titleTextStyle: TextStyle(
          color: Color(AppColors.textPrimary),
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: Color(AppColors.textPrimary)),
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusMedium),
          side: const BorderSide(color: Color(AppColors.divider), width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(AppColors.primary),
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: const Color(AppColors.primary),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey[100],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: const BorderSide(color: Color(AppColors.primary), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: const BorderSide(color: Color(AppColors.error)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppDimens.paddingLarge,
          vertical: 16,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        selectedItemColor: Color(AppColors.primary),
        unselectedItemColor: Color(AppColors.textSecondary),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: Color(AppColors.divider),
        thickness: 0.5,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
        headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        titleLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        titleMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(fontSize: 16),
        bodyMedium: TextStyle(fontSize: 14),
        bodySmall: TextStyle(fontSize: 12),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorSchemeSeed: const Color(AppColors.primary),
      scaffoldBackgroundColor: const Color(AppColors.darkBackground),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(AppColors.darkBackground),
        elevation: 0.5,
        titleTextStyle: TextStyle(
          color: Color(AppColors.darkTextPrimary),
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: Color(AppColors.darkTextPrimary)),
      ),
      cardTheme: CardTheme(
        color: const Color(AppColors.darkCard),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusMedium),
          side: const BorderSide(color: Color(AppColors.darkBorder), width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(AppColors.primary),
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: const Color(AppColors.primary),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(AppColors.darkSurface),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: const BorderSide(color: Color(AppColors.primary), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppDimens.borderRadiusXL),
          borderSide: const BorderSide(color: Color(AppColors.error)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppDimens.paddingLarge,
          vertical: 16,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        selectedItemColor: Color(AppColors.primary),
        unselectedItemColor: Color(AppColors.darkTextSecondary),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Color(AppColors.darkBackground),
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: Color(AppColors.darkDivider),
        thickness: 0.5,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(AppColors.darkTextPrimary)),
        headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(AppColors.darkTextPrimary)),
        headlineSmall: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AppColors.darkTextPrimary)),
        titleLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(AppColors.darkTextPrimary)),
        titleMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(AppColors.darkTextPrimary)),
        bodyLarge: TextStyle(fontSize: 16, color: Color(AppColors.darkTextPrimary)),
        bodyMedium: TextStyle(fontSize: 14, color: Color(AppColors.darkTextPrimary)),
        bodySmall: TextStyle(fontSize: 12, color: Color(AppColors.darkTextSecondary)),
      ),
    );
  }
}
