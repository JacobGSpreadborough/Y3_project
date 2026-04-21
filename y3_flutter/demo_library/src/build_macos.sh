# Define the function for macOS build
build_macos() {
  BUILD_TYPE="${1:-Debug}"
  echo "Building for macOS in $BUILD_TYPE mode"
  cmake -DCMAKE_BUILD_TYPE=$BUILD_TYPE -G "Unix Makefiles" -B $BASEDIR/cmake-build-macos -S $BASEDIR/
  cmake --build $BASEDIR/cmake-build-macos
}

build_macos "$@"
