import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'dart:typed_data';

class Rnnoise {
  static final _lib = DynamicLibrary.process();
  static final _nativeArray = calloc<Float>(480);

  static final _rnnoise_process_frame_wrapper = _lib
      .lookupFunction<
        Void Function(Pointer<Float>),
        void Function(Pointer<Float>)
      >('rnnoise_process_frame_wrapper');

  static void rnnoise_process_frame_wrapper(Float32List data) {
    _nativeArray.asTypedList(data.length).setAll(0, data);
    _rnnoise_process_frame_wrapper(_nativeArray);
    data.setAll(0, _nativeArray.asTypedList(data.length));
  }

  static final _rnnoise_init_wrapper = _lib
      .lookupFunction<Void Function(), void Function()>('rnnoise_init_wrapper');

  static void rnnoise_init_wrapper() {
    _rnnoise_init_wrapper();
  }

  static final _rnnoise_destroy_wrapper = _lib
      .lookupFunction<Void Function(), void Function()>(
        'rnnoise_destroy_wrapper',
      );

  static void rnnoise_destroy_wrapper() {
    _rnnoise_destroy_wrapper();
    calloc.free(_nativeArray);
  }
}
