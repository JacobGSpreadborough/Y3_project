
#import "NativeSampleModuleProvider.h"
#import "NativeSampleModule.h"
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>

@implementation NativeSampleModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeSampleModule>(
      params.jsInvoker);
}

@end
