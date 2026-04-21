#include "NativeSampleModule.h"
#include "rnnoise.h"
#include <string>


#define FRAME_SIZE 480

namespace facebook::react {

NativeSampleModule::NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSampleModuleCxxSpec(std::move(jsInvoker)) {}

void NativeSampleModule::rnnoise_init_wrapper(jsi::Runtime& rt) {
  st = rnnoise_create(NULL);
}

void NativeSampleModule::rnnoise_destroy_wrapper(jsi::Runtime& rt) {
  rnnoise_destroy(st);
}

std::string NativeSampleModule::rnnoise_checkhealth(jsi::Runtime& rt) {
  int size = rnnoise_get_size();
  int frameSize = rnnoise_get_frame_size();
  return "size: " + std::to_string(size) + "\n" + "frame size: " + std::to_string(frameSize) + "\n";
}
std::vector<float> NativeSampleModule::rnnoise_process_frame_wrapper(jsi::Runtime& rt, std::vector<float> input) {
  // scale from [-1,1] to [-32768,32767]
  if(input.size() != FRAME_SIZE) return input;
  for(int i=0;i<FRAME_SIZE;i++) {
    input[i] = input[i] * 32767;
  }

  rnnoise_process_frame(st, input.data(), input.data());
  // scale data back down, using same vector for input and output
  for(int i=0;i<FRAME_SIZE;i++) {
    input[i] = input[i] / 32767;
  }

  return input;
}

} // namespace facebook::react
