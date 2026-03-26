--[[
  Epic C.2 — In-game farm guides (checklist + source link).
  Data: MyNextMountGuides.lua (run: npm run addon:sync-guides).
  Progress: MyNextMountDB.guideChecks[spellId][stepIndex] — per ACCOUNT (SavedVariables).
  Slash: /mnguides or /mfguides
]]

local ADDON_NAME = "MyNextMount"

local guideFrame
local guideNameStr
local guideSpellStr
local guideOverviewStr
local guideScroll
local guideScrollChild
local checkPool = {}
local pendingSourceUrl = ""

local function HookEditBoxCloseOnCtrlC(edit, hideFn)
  if edit._MyNextMount_copyCloseHooked then
    return
  end
  edit._MyNextMount_copyCloseHooked = true
  edit:HookScript("OnKeyDown", function(_, key)
    if not key or not IsControlKeyDown() then
      return
    end
    if string.upper(key) == "C" then
      C_Timer.After(0, hideFn)
    end
  end)
end

StaticPopupDialogs["MYNEXTMOUNT_GUIDE_SOURCE_COPY"] = {
  text = "Source URL (|cffaaaaaaCtrl+C|r to copy; closes after copy):",
  button1 = OKAY,
  timeout = 0,
  whileDead = true,
  hideOnEscape = true,
  hasEditBox = true,
  wide = true,
  OnShow = function(self)
    local eb = self:GetEditBox()
    eb:SetMaxLetters(2048)
    eb:SetText(pendingSourceUrl)
    eb:SetFocus()
    eb:HighlightText()
    HookEditBoxCloseOnCtrlC(eb, function()
      StaticPopup_Hide("MYNEXTMOUNT_GUIDE_SOURCE_COPY")
    end)
  end,
}

local function GuideDataReady()
  return MyNextMountGuideData and MyNextMountGuideData.order and #MyNextMountGuideData.order > 0
end

function MyNextMountGuideUI_IsStepChecked(spellId, stepIndex)
  local db = MyNextMountDB and MyNextMountDB.guideChecks
  if not db or not db[spellId] then
    return false
  end
  return db[spellId][stepIndex] and true or false
end

function MyNextMountGuideUI_SetStepChecked(spellId, stepIndex, checked)
  MyNextMountDB = MyNextMountDB or {}
  MyNextMountDB.guideChecks = MyNextMountDB.guideChecks or {}
  MyNextMountDB.guideChecks[spellId] = MyNextMountDB.guideChecks[spellId] or {}
  if checked then
    MyNextMountDB.guideChecks[spellId][stepIndex] = true
  else
    MyNextMountDB.guideChecks[spellId][stepIndex] = nil
  end
end

local currentGuideListIndex = 1

local function GetCurrentSpellId()
  if not GuideDataReady() then
    return nil
  end
  local order = MyNextMountGuideData.order
  if currentGuideListIndex < 1 then
    currentGuideListIndex = 1
  end
  if currentGuideListIndex > #order then
    currentGuideListIndex = #order
  end
  return order[currentGuideListIndex]
end

local function EnsureCheckPool(n)
  while #checkPool < n do
    local i = #checkPool + 1
    local cb = CreateFrame("CheckButton", "MyNextMountGuideCheck" .. i, guideScrollChild, "UICheckButtonTemplate")
    cb:SetSize(22, 22)
    local fs = guideScrollChild:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    fs:SetJustifyH("LEFT")
    fs:SetWordWrap(true)
    cb.labelFs = fs
    cb:SetScript("OnClick", function(self)
      local sid = self.spellId
      local idx = self.stepIndex
      if sid and idx then
        MyNextMountGuideUI_SetStepChecked(sid, idx, self:GetChecked())
      end
    end)
    checkPool[i] = cb
  end
end

local function RefreshGuideContent()
  if not guideFrame or not guideScrollChild then
    return
  end

  if not GuideDataReady() then
    guideNameStr:SetText("No guides loaded")
    guideSpellStr:SetText("")
    guideOverviewStr:SetText("Regenerate MyNextMountGuides.lua (npm run addon:sync-guides).")
    for _, cb in ipairs(checkPool) do
      cb:Hide()
      if cb.labelFs then
        cb.labelFs:Hide()
      end
    end
    guideScrollChild:SetHeight(40)
    return
  end

  local spellId = GetCurrentSpellId()
  local data = MyNextMountGuideData.byId[spellId]
  if not data then
    guideNameStr:SetText("Missing guide data")
    guideSpellStr:SetText("ID " .. tostring(spellId))
    guideOverviewStr:SetText("")
    return
  end

  guideNameStr:SetText(data.name or ("Spell " .. tostring(spellId)))
  guideSpellStr:SetText("Summon spell ID: " .. tostring(spellId))
  guideOverviewStr:SetText(data.overview or "")

  local steps = data.checklist or {}
  local n = #steps
  EnsureCheckPool(n)

  for i = 1, #checkPool do
    local cb = checkPool[i]
    if i <= n then
      cb.spellId = spellId
      cb.stepIndex = i
      cb:SetChecked(MyNextMountGuideUI_IsStepChecked(spellId, i))
      cb.labelFs:SetWidth(430)
      cb.labelFs:SetText(steps[i])
      cb.labelFs:Show()
      cb:Show()
    else
      cb:Hide()
      cb.labelFs:Hide()
    end
  end

  local y = 0
  for i = 1, n do
    local cb = checkPool[i]
    cb:ClearAllPoints()
    cb.labelFs:ClearAllPoints()
    cb:SetPoint("TOPLEFT", guideScrollChild, "TOPLEFT", 0, -y)
    cb.labelFs:SetPoint("TOPLEFT", cb, "TOPRIGHT", 6, -2)
    local h = math.max(cb.labelFs:GetStringHeight() + 10, 26)
    y = y + h
  end

  guideScrollChild:SetHeight(math.max(y, 20))
  guideScroll:UpdateScrollChildRect()
end

local function HideGuideUI()
  if guideFrame then
    guideFrame:Hide()
  end
end

function MyNextMountGuideUI_Open()
  if not GuideDataReady() then
    print(
      "|cffffcc00"
        .. ADDON_NAME
        .. ":|r No guide data. Run |cffddddddnpm run addon:sync-guides|r and reload UI."
    )
    return
  end
  if not guideFrame then
    MyNextMountGuideUI_CreateFrame()
  end
  RefreshGuideContent()
  guideFrame:Show()
end

function MyNextMountGuideUI_CreateFrame()
  local f = CreateFrame("Frame", "MyNextMountGuideFrame", UIParent, "BackdropTemplate")
  f:SetSize(520, 420)
  f:SetPoint("CENTER", UIParent, "CENTER", 0, 0)
  f:SetFrameStrata("DIALOG")
  f:SetFrameLevel(199)
  f:SetMovable(true)
  f:SetClampedToScreen(true)
  f:SetBackdrop({
    bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
    edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
    tile = true,
    tileSize = 32,
    edgeSize = 32,
    insets = { left = 10, right = 10, top = 10, bottom = 10 },
  })
  f:SetBackdropColor(0, 0, 0, 0.92)
  tinsert(UISpecialFrames, f:GetName())

  local title = f:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
  title:SetPoint("TOP", f, "TOP", 0, -18)
  title:SetText("Farm guide")

  guideNameStr = f:CreateFontString(nil, "OVERLAY", "GameFontNormal")
  guideNameStr:SetPoint("TOP", title, "BOTTOM", 0, -12)
  guideNameStr:SetWidth(480)
  guideNameStr:SetJustifyH("CENTER")

  guideSpellStr = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  guideSpellStr:SetPoint("TOP", guideNameStr, "BOTTOM", 0, -4)
  guideSpellStr:SetWidth(480)
  guideSpellStr:SetJustifyH("CENTER")

  local prevBtn = CreateFrame("Button", nil, f, "UIPanelButtonTemplate")
  prevBtn:SetSize(70, 22)
  prevBtn:SetPoint("TOPLEFT", f, "TOPLEFT", 20, -88)
  prevBtn:SetText("< Prev")
  prevBtn:SetScript("OnClick", function()
    if not GuideDataReady() then
      return
    end
    currentGuideListIndex = currentGuideListIndex - 1
    if currentGuideListIndex < 1 then
      currentGuideListIndex = #MyNextMountGuideData.order
    end
    RefreshGuideContent()
  end)

  local nextBtn = CreateFrame("Button", nil, f, "UIPanelButtonTemplate")
  nextBtn:SetSize(70, 22)
  nextBtn:SetPoint("TOPRIGHT", f, "TOPRIGHT", -20, -88)
  nextBtn:SetText("Next >")
  nextBtn:SetScript("OnClick", function()
    if not GuideDataReady() then
      return
    end
    currentGuideListIndex = currentGuideListIndex + 1
    if currentGuideListIndex > #MyNextMountGuideData.order then
      currentGuideListIndex = 1
    end
    RefreshGuideContent()
  end)

  guideOverviewStr = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  guideOverviewStr:SetPoint("TOPLEFT", prevBtn, "BOTTOMLEFT", 0, -12)
  guideOverviewStr:SetPoint("TOPRIGHT", nextBtn, "BOTTOMRIGHT", 0, -12)
  guideOverviewStr:SetWidth(460)
  guideOverviewStr:SetJustifyH("LEFT")
  guideOverviewStr:SetWordWrap(true)

  guideScroll = CreateFrame("ScrollFrame", "MyNextMountGuideScroll", f, "UIPanelScrollFrameTemplate")
  guideScroll:SetPoint("TOPLEFT", guideOverviewStr, "BOTTOMLEFT", -8, -12)
  guideScroll:SetPoint("BOTTOMRIGHT", f, "BOTTOMRIGHT", -32, 96)

  guideScrollChild = CreateFrame("Frame", nil, guideScroll)
  guideScrollChild:SetWidth(460)
  guideScrollChild:SetHeight(40)
  guideScroll:SetScrollChild(guideScrollChild)

  local sourceBtn = CreateFrame("Button", nil, f, "UIPanelButtonTemplate")
  sourceBtn:SetSize(180, 24)
  sourceBtn:SetPoint("BOTTOMLEFT", f, "BOTTOMLEFT", 20, 44)
  sourceBtn:SetText("Copy source URL")
  sourceBtn:SetScript("OnClick", function()
    local sid = GetCurrentSpellId()
    local data = sid and MyNextMountGuideData.byId[sid]
    local u = data and data.sourceUrl
    if not u or u == "" then
      print("|cffffcc00" .. ADDON_NAME .. ":|r No source URL for this guide.")
      return
    end
    pendingSourceUrl = u
    StaticPopup_Show("MYNEXTMOUNT_GUIDE_SOURCE_COPY")
  end)

  local closeBtn = CreateFrame("Button", nil, f, "UIPanelButtonTemplate")
  closeBtn:SetSize(120, 24)
  closeBtn:SetPoint("BOTTOM", f, "BOTTOM", 0, 16)
  closeBtn:SetText(CLOSE)
  closeBtn:SetScript("OnClick", HideGuideUI)

  f:SetScript("OnHide", function()
    -- no-op
  end)

  guideFrame = f
  f:Hide()
end

function MyNextMountGuideUI_OnOptionsCanvasReady(canvas, anchorBelow)
  if not canvas or not anchorBelow then
    return
  end

  local gh = canvas:CreateFontString(nil, "ARTWORK", "GameFontNormal")
  gh:SetPoint("TOPLEFT", anchorBelow, "BOTTOMLEFT", 0, -28)
  gh:SetText("Farm guides (Epic C.2)")

  local ghelp = canvas:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
  ghelp:SetPoint("TOPLEFT", gh, "BOTTOMLEFT", 0, -6)
  ghelp:SetWidth(600)
  ghelp:SetJustifyH("LEFT")
  ghelp:SetWordWrap(true)
  ghelp:SetText(
    "Same checklists as |cffddddddmynextmount.com|r (|cffdddddddata/mount-guides.json|r → |cffddddddMyNextMountGuides.lua|r). "
      .. "Checkbox progress is saved |cffaaaaaaper account|r in SavedVariables (|cffddddddMyNextMountDB.guideChecks|r). "
      .. "No network required. |cffdddddd/mnguides|r or |cffdddddd/mfguides|r opens the window."
  )

  local gbtn = CreateFrame("Button", nil, canvas, "UIPanelButtonTemplate")
  gbtn:SetSize(220, 26)
  gbtn:SetPoint("TOPLEFT", ghelp, "BOTTOMLEFT", 0, -10)
  gbtn:SetText("Open farm guide window")
  gbtn:SetScript("OnClick", function()
    MyNextMountGuideUI_Open()
  end)
end

SLASH_MYNEXTMOUNTGUIDE1 = "/mnguides"
SLASH_MYNEXTMOUNTGUIDE2 = "/mfguides"
SlashCmdList["MYNEXTMOUNTGUIDE"] = function()
  MyNextMountGuideUI_Open()
end
