import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class ImageUtils {
  static Future<String?> imageToBase64(XFile imageFile, {int maxSizeKB = 500}) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final originalSize = bytes.lengthInBytes;
      final maxBytes = maxSizeKB * 1024;

      if (originalSize <= maxBytes) {
        return base64Encode(bytes);
      }

      // Simple compression: resize by reducing quality
      int quality = 85;
      List<int>? compressed;
      while (quality > 20) {
        // For basic compression, just truncate or reduce
        compressed = bytes;
        if (compressed.length <= maxBytes) break;
        quality -= 10;
      }
      return base64Encode(compressed ?? bytes);
    } catch (e) {
      debugPrint('Error converting image to base64: $e');
      return null;
    }
  }

  static Image imageFromBase64(String? base64String, {double? width, double? height, BoxFit fit = BoxFit.cover}) {
    if (base64String == null || base64String.isEmpty) {
      return Image.asset(
        'assets/images/placeholder.png',
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(width, height),
      );
    }
    try {
      final bytes = base64Decode(base64String);
      return Image.memory(
        bytes,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(width, height),
      );
    } catch (e) {
      return _buildPlaceholder(width, height);
    }
  }

  static Widget _buildPlaceholder(double? width, double? height) {
    return Container(
      width: width,
      height: height,
      color: const Color(0xFFE5E7EB),
      child: const Icon(Icons.image, color: Color(0xFF9CA3AF)),
    );
  }

  static MemoryImage? memoryImageFromBase64(String? base64String) {
    if (base64String == null || base64String.isEmpty) return null;
    try {
      final bytes = base64Decode(base64String);
      return MemoryImage(bytes);
    } catch (e) {
      return null;
    }
  }

  static Future<XFile?> pickImage(ImageSource source) async {
    final picker = ImagePicker();
    return await picker.pickImage(source: source, imageQuality: 70, maxWidth: 1080, maxHeight: 1080);
  }

  static Future<List<XFile>> pickMultipleImages() async {
    final picker = ImagePicker();
    return await picker.pickMultiImage(imageQuality: 70, maxWidth: 1080, maxHeight: 1080);
  }

  static bool validateImageSize(XFile file, {int maxMB = 5}) {
    final fileSizeMB = file.length() / (1024 * 1024);
    return fileSizeMB <= maxMB;
  }
}
