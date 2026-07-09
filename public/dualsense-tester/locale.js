(() => {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("lang");
  const browserLanguage = override || (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  const isChinese = /^zh\b/i.test(browserLanguage);

  document.documentElement.lang = isChinese ? "zh-CN" : "en";
  document.title = "DualSense Tester | TECHM8";

  if (isChinese) {
    return;
  }

  const exact = new Map([
    ["DS工具箱", "DS Toolbox"],
    ["一个帮你解决DS系列手柄所有问题的网页", "A toolbox for DualSense and DualShock controller diagnostics."],
    ["请连接手柄", "Connect a Controller"],
    ["请使用 USB 连接手柄后点击按钮", "Connect the controller by USB, then click the button."],
    ["连接设备", "Connect Device"],
    ["WebHID 注意事项", "WebHID Notes"],
    ["请使用最新版 Chrome 或 Edge 浏览器，其他浏览器可能不支持 WebHID。", "Use the latest Chrome or Edge. Other browsers may not support WebHID."],
    ["连接时尽量关闭 Steam、DS4Windows 等占用手柄的程序，避免设备被抢占。", "Close Steam, DS4Windows, or other controller software before connecting."],
    ["首次连接会弹出设备授权窗口，请在弹窗中勾选手柄并确认连接。", "The first connection opens a device permission prompt. Select the controller and confirm."],
    ["等待连接", "Waiting for connection"],
    ["设备已连接", "Device connected"],
    ["已连接", "Connected"],
    ["未连接", "Disconnected"],
    ["设备在线", "Device online"],
    ["已连接设备", "Connected device"],
    ["当前设备", "Current device"],
    ["当前设备不支持功能调试。", "This device does not support output debugging."],
    ["当前设备不是 DualSense Edge，无法使用配置文件模式。", "The current device is not a DualSense Edge, so profile mode is unavailable."],
    ["请先连接手柄。", "Connect a controller first."],
    ["请先连接手柄后再使用配置文件功能。", "Connect a controller before using profile features."],
    ["手柄信息", "Controller Info"],
    ["设备与连接状态", "Device and connection status"],
    ["功能调试", "Output Debugging"],
    ["灯效与输出调试", "Lights and output debugging"],
    ["摇杆校准", "Stick Calibration"],
    ["中心与外圈校准", "Center and outer range calibration"],
    ["Edge配置", "Edge Profiles"],
    ["Profile 模式", "Profile mode"],
    ["工具导航", "Tool navigation"],
    ["手柄型号", "Controller model"],
    ["手柄真伪", "Controller authenticity"],
    ["固件版本", "Firmware version"],
    ["固件日期", "Firmware date"],
    ["主板型号", "Board model"],
    ["电池容量", "Battery level"],
    ["充电状态", "Charging status"],
    ["耳机状态", "Headset status"],
    ["报文时间", "Report time"],
    ["未知型号", "Unknown model"],
    ["未知日期", "Unknown date"],
    ["未知状态", "Unknown status"],
    ["未识别", "Unrecognized"],
    ["未充电", "Not charging"],
    ["充电中", "Charging"],
    ["正品", "Genuine"],
    ["盗版", "Counterfeit"],
    ["左摇杆", "Left Stick"],
    ["右摇杆", "Right Stick"],
    ["左", "Left"],
    ["右", "Right"],
    ["上", "Up"],
    ["下", "Down"],
    ["原始：", "Raw:"],
    ["映射：", "Mapped:"],
    ["原始输入", "Raw input"],
    ["映射输入", "Mapped input"],
    ["测试偏离率", "Test deviation"],
    ["平均偏离率:", "Average deviation:"],
    ["麦克风指示灯", "Microphone light"],
    ["灯带颜色", "Lightbar color"],
    ["玩家指示灯", "Player lights"],
    ["指示灯亮度", "Light brightness"],
    ["震动（重）", "Vibration (heavy)"],
    ["震动（轻）", "Vibration (light)"],
    ["震动强度", "Vibration intensity"],
    ["扬声器音量", "Speaker volume"],
    ["耳机音量", "Headphone volume"],
    ["1kHz 测试（扬声器）", "1 kHz test (speaker)"],
    ["1kHz 测试（耳机）", "1 kHz test (headphones)"],
    ["开始测试", "Start test"],
    ["停止测试", "Stop test"],
    ["关", "Off"],
    ["亮", "Bright"],
    ["中", "Medium"],
    ["暗", "Dim"],
    ["全开", "All on"],
    ["自适应扳机", "Adaptive Triggers"],
    ["扳机", "Trigger"],
    ["左右扳机", "Left and right triggers"],
    ["左右独立", "Independent left/right"],
    ["仅左扳机", "Left trigger only"],
    ["仅右扳机", "Right trigger only"],
    ["扳机校准", "Trigger calibration"],
    ["扳机死区", "Trigger dead zone"],
    ["死区调整", "Dead zone adjustment"],
    ["曲线调整", "Curve adjustment"],
    ["灵敏度曲线", "Sensitivity curve"],
    ["摇杆灵敏度", "Stick sensitivity"],
    ["扳机效果强度", "Trigger effect intensity"],
    ["目标扳机", "Target trigger"],
    ["起始位置", "Start position"],
    ["结束位置", "End position"],
    ["频率", "Frequency"],
    ["强度", "Intensity"],
    ["阻力", "Resistance"],
    ["精准", "Precise"],
    ["稳定", "Stable"],
    ["快速", "Fast"],
    ["动态", "Dynamic"],
    ["自动扳机", "Automatic trigger"],
    ["准备阶段", "Preparation"],
    ["范围阶段", "Range stage"],
    ["准备就绪", "Ready"],
    ["校准中", "Calibrating"],
    ["校准完成", "Calibration complete"],
    ["一键校准", "One-click calibration"],
    ["开始校准", "Start calibration"],
    ["范围校准", "Range calibration"],
    ["精确中心校准", "Precise center calibration"],
    ["校准中心", "Calibrate center"],
    ["校准外圈", "Calibrate outer range"],
    ["保存校准结果", "Save calibration result"],
    ["编辑微调数据", "Edit fine-tuning data"],
    ["微调校准数据", "Fine-tune calibration data"],
    ["清空临时参数", "Clear temporary values"],
    ["数据与维护", "Data and maintenance"],
    ["重置", "Reset"],
    ["刷新配置", "Refresh profiles"],
    ["新建配置", "New profile"],
    ["未命名配置", "Untitled profile"],
    ["配置已创建", "Profile created"],
    ["配置已删除", "Profile deleted"],
    ["删除配置", "Delete profile"],
    ["重命名配置", "Rename profile"],
    ["重命名成功", "Renamed successfully"],
    ["名称不能为空", "Name cannot be empty"],
    ["当前激活", "Active"],
    ["当前手柄激活", "Active on controller"],
    ["默认槽位（只读）", "Default slot (read only)"],
    ["可管理该配置槽位。", "This profile slot can be managed."],
    ["该槽位未分配配置。", "No profile is assigned to this slot."],
    ["新建", "New"],
    ["编辑", "Edit"],
    ["重命名", "Rename"],
    ["删除", "Delete"],
    ["保存", "Save"],
    ["创建", "Create"],
    ["取消", "Cancel"],
    ["确定", "OK"],
    ["关闭", "Close"],
    ["返回", "Back"],
    ["返回列表", "Back to list"],
    ["完成", "Done"],
    ["暂不支持", "Not supported yet"],
    ["保存成功", "Saved successfully"],
    ["写入设备", "Write to device"],
    ["放弃修改", "Discard changes"],
    ["未保存更改", "Unsaved changes"],
    ["加锁模块", "Lock module"],
    ["解锁模块", "Unlock module"],
    ["左模块状态", "Left module status"],
    ["右模块状态", "Right module status"],
    ["已解锁", "Unlocked"],
    ["未解锁", "Locked"],
    ["显示接线图", "Show wiring diagram"],
    ["隐藏接线图", "Hide wiring diagram"],
    ["开源项目", "Open source"],
    ["作者B站", "Author Bilibili"],
    ["控制台", "Console"],
    ["页面未找到", "Page not found"],
    ["链接可能已失效，或者页面正在重构中。", "The link may be invalid, or the page is being rebuilt."],
    ["返回首页", "Back to home"],
    ["加载中", "Loading"],
    ["无匹配数据", "No matching data"],
    ["无数据", "No data"],
    ["暂无数据", "No data"],
    ["请选择", "Select"],
    ["提示", "Notice"],
    ["颜色选择器", "Color picker"],
    ["清空", "Clear"],
    ["全部", "All"],
    ["筛选", "Filter"],
    ["查看图片", "Preview image"],
    ["继续上传", "Continue upload"],
    ["加载失败", "Load failed"],
    ["关闭此对话框", "Close this dialog"],
    ["切换下拉选项", "Toggle dropdown"],
    ["减少数值", "Decrease value"],
    ["增加数值", "Increase value"],
    ["选择起始值", "Select start value"],
    ["选择结束值", "Select end value"],
    ["下一步", "Next"],
    ["上一步", "Previous"],
    ["结束导览", "Finish tour"],
    ["上一页", "Previous page"],
    ["下一页", "Next page"],
    ["前往", "Go to"],
    ["条/页", "items/page"],
    ["页", "page"],
    ["合计", "Total"],
    ["此刻", "Now"],
    ["今天", "Today"],
    ["选择日期", "Select date"],
    ["选择时间", "Select time"],
    ["开始日期", "Start date"],
    ["结束日期", "End date"],
    ["开始时间", "Start time"],
    ["结束时间", "End time"],
    ["上一张幻灯片", "Previous slide"],
    ["下一张幻灯片", "Next slide"],
    ["冰晶蓝", "Ice Blue"],
    ["午夜黑", "Midnight Black"],
    ["星尘白", "White"],
    ["星光蓝", "Starlight Blue"],
    ["星幻粉", "Nova Pink"],
    ["银河紫", "Galactic Purple"],
    ["宇宙红", "Cosmic Red"],
    ["火山红", "Volcanic Red"],
    ["钴蓝", "Cobalt Blue"],
    ["纯银", "Sterling Silver"],
    ["灰色迷彩", "Grey Camouflage"],
    ["晶彩靛", "Chroma Indigo"],
    ["晶彩青", "Chroma Teal"],
    ["晶彩珍珠", "Chroma Pearl"],
    ["30周年纪念", "30th Anniversary"],
    ["堡垒之夜", "Fortnite"],
    ["最后生还者", "The Last of Us"],
    ["漫威蜘蛛侠2", "Marvel's Spider-Man 2"],
    ["宇宙机器人", "Astro Bot"]
  ]);

  const partial = [
    [/共\s*(\d+)\s*项/g, "Total $1 items"],
    [/已选\s*(\d+)\/(\d+)/g, "$1/$2 selected"],
    [/第\s*(\d+)\s*页/g, "Page $1"],
    [/已采样\s*(\d*)/g, "Samples $1"],
    [/采样/g, "Sample"],
    [/(\d+)\s*月/g, "$1"],
    [/星期日/g, "Sunday"],
    [/星期一/g, "Monday"],
    [/星期二/g, "Tuesday"],
    [/星期三/g, "Wednesday"],
    [/星期四/g, "Thursday"],
    [/星期五/g, "Friday"],
    [/星期六/g, "Saturday"],
    [/一月/g, "January"],
    [/二月/g, "February"],
    [/三月/g, "March"],
    [/四月/g, "April"],
    [/五月/g, "May"],
    [/六月/g, "June"],
    [/七月/g, "July"],
    [/八月/g, "August"],
    [/九月/g, "September"],
    [/十月/g, "October"],
    [/十一月/g, "November"],
    [/十二月/g, "December"]
  ];

  const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE"]);
  let scheduled = false;

  const translateValue = (value) => {
    if (!value || !/[\u4e00-\u9fff]/.test(value)) {
      return value;
    }

    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    const trimmed = value.trim();

    if (exact.has(trimmed)) {
      return `${leading}${exact.get(trimmed)}${trailing}`;
    }

    let output = value;
    for (const [source, target] of exact) {
      if (source.length > 1) {
        output = output.split(source).join(target);
      }
    }
    for (const [source, target] of partial) {
      output = output.replace(source, target);
    }
    return output;
  };

  const translateAttributes = (element) => {
    for (const attr of ["title", "aria-label", "placeholder", "alt", "description"]) {
      if (element.hasAttribute(attr)) {
        const current = element.getAttribute(attr);
        const translated = translateValue(current);
        if (translated !== current) {
          element.setAttribute(attr, translated);
        }
      }
    }
  };

  const translateNode = (root) => {
    if (!root) return;

    if (root.nodeType === Node.ELEMENT_NODE) {
      if (ignoredTags.has(root.tagName)) return;
      translateAttributes(root);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && ignoredTags.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    do {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const translated = translateValue(node.nodeValue);
        if (translated !== node.nodeValue) {
          node.nodeValue = translated;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        translateAttributes(node);
      }
    } while (walker.nextNode());
  };

  const run = () => {
    scheduled = false;
    translateNode(document.body);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "aria-label", "placeholder", "alt", "description"]
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
