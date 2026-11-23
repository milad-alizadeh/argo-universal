#import <AppKit/AppKit.h>
#import <objc/runtime.h>
#include <node_api.h>

static char sidebarGlassKey;

static NSView *WindowView(napi_env env, napi_value handle) {
  void *bytes;
  size_t length;
  if (napi_get_buffer_info(env, handle, &bytes, &length) != napi_ok ||
      length != sizeof(void *)) {
    return nil;
  }
  return *static_cast<NSView *__unsafe_unretained *>(bytes);
}

static napi_value Attach(napi_env env, napi_callback_info info) {
  size_t count = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &count, args, nullptr, nullptr);
  NSView *container = count == 1 ? WindowView(env, args[0]) : nil;
  BOOL attached = NO;
  if (@available(macOS 26.0, *)) {
    if (container && [NSThread isMainThread]) {
      NSGlassEffectView *glass = [[NSGlassEffectView alloc] initWithFrame:NSZeroRect];
      glass.cornerRadius = 16;
      glass.hidden = YES;
      glass.autoresizingMask = NSViewHeightSizable | NSViewMaxXMargin;
      [container addSubview:glass positioned:NSWindowBelow relativeTo:nil];
      objc_setAssociatedObject(container, &sidebarGlassKey, glass, OBJC_ASSOCIATION_RETAIN);
      attached = YES;
    }
  }
  napi_value result;
  napi_get_boolean(env, attached, &result);
  return result;
}

static bool ReadCoordinate(napi_env env, napi_value frame, const char *name, double *coordinate) {
  napi_value value;
  return napi_get_named_property(env, frame, name, &value) == napi_ok &&
      napi_get_value_double(env, value, coordinate) == napi_ok;
}

static napi_value SetFrame(napi_env env, napi_callback_info info) {
  size_t count = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &count, args, nullptr, nullptr);
  if (count != 2 || ![NSThread isMainThread]) return nullptr;
  NSView *container = WindowView(env, args[0]);
  NSView *glass = objc_getAssociatedObject(container, &sidebarGlassKey);
  if (!glass) return nullptr;

  double x, width, top, bottom;
  napi_value frame = args[1];
  if (!ReadCoordinate(env, frame, "x", &x) ||
      !ReadCoordinate(env, frame, "width", &width) ||
      !ReadCoordinate(env, frame, "top", &top) ||
      !ReadCoordinate(env, frame, "bottom", &bottom)) return nullptr;

  NSRect bounds = container.bounds;
  CGFloat height = NSHeight(bounds) - top - bottom;
  CGFloat clippedWidth = MIN(width, NSWidth(bounds) - x);
  glass.hidden = clippedWidth <= 0 || height <= 0;
  if (!glass.hidden) {
    CGFloat y = container.isFlipped ? top : bottom;
    glass.frame = NSMakeRect(NSMinX(bounds) + x, NSMinY(bounds) + y, clippedWidth, height);
  }
  return nullptr;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor properties[] = {
    {"attach", nullptr, Attach, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"setFrame", nullptr, SetFrame, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, 2, properties);
  return exports;
}
