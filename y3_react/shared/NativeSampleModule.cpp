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
std::vector<float> NativeSampleModule::rnnoise_process_frame_wrapper(jsi::Runtime& rt, std::vector<float> input, std::string status) {
  if(input.size() != FRAME_SIZE) return input;
  if(status == "raw") {
    for(int i=0;i<FRAME_SIZE;i++){
      input[i] *= 32768.0f;
    }
  }
  rnnoise_process_frame(st, input.data(), input.data());

  if(status == "raw") {
    for(int i=0;i<FRAME_SIZE;i++){
      input[i] /= 32768.0f;
    }
  }
  return input;
}

} // namespace facebook::react
