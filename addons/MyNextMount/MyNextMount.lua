--[[
  MyNextMount — paste string into mynextmount.com (or your dev URL).
  Format v1: docs/export-contract.md
  Slash: /mountexport, /mynextmount, or /mnm
  Options: Esc → Options → AddOns → MyNextMount
]]

local ADDON_NAME = "MyNextMount"

--- Registered canvas category for Settings API (also used by minimap right-click).
local MNM_SettingsCategory = nil

MyNextMountDB = MyNextMountDB or {}
MyNextMountDB.websiteUrl = MyNextMountDB.websiteUrl or ""
-- Minimap: angle (degrees) on rim; hidden = Shift+right-click hide (re-show in options).
if MyNextMountDB.minimapHidden == nil then
  MyNextMountDB.minimapHidden = false
end

local pendingDocsUrl = ""

--- Set when options panel toggles minimap visibility (assigned after EnsureMinimapButton).
local ApplyMinimapVisibility

-- After Ctrl+C, hide on the next tick so the client handles Copy first (Raidbots-style).
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

StaticPopupDialogs["MYNEXTMOUNT_URL_COPY"] = {
  text = "Website URL (|cffaaaaaaCtrl+C|r to copy; closes after copy):",
  button1 = OKAY,
  timeout = 0,
  whileDead = true,
  hideOnEscape = true,
  hasEditBox = true,
  wide = true,
  OnShow = function(self)
    local eb = self:GetEditBox()
    eb:SetMaxLetters(2048)
    eb:SetText(pendingDocsUrl)
    eb:SetFocus()
    eb:HighlightText()
    HookEditBoxCloseOnCtrlC(eb, function()
      StaticPopup_Hide("MYNEXTMOUNT_URL_COPY")
    end)
  end,
}

local exportFrame
local exportEdit
local exportScroll

local function BuildExportString()
  if not C_MountJournal or type(C_MountJournal.GetMountIDs) ~= "function" then
    return nil, "Mount Journal API is not available in this client."
  end

  if not IsLoggedIn() then
    return nil, "Log in to a character first."
  end

  local mountIDs = C_MountJournal.GetMountIDs()
  if not mountIDs then
    return nil, "Mount journal is not ready yet (try again in a moment)."
  end

  local spellSet = {}
  for _, mountID in pairs(mountIDs) do
    local _, spellID, _, _, _, _, _, _, _, _, isCollected =
      C_MountJournal.GetMountInfoByID(mountID)
    if isCollected and spellID and spellID > 0 then
      spellSet[spellID] = true
    end
  end

  local sorted = {}
  for sid in pairs(spellSet) do
    sorted[#sorted + 1] = sid
  end
  table.sort(sorted, function(a, b)
    return a < b
  end)

  local body = table.concat(sorted, ",")
  return "M:" .. body, nil, #sorted
end

local function UpdateExportEditHeight()
  if not exportEdit or not exportScroll then
    return
  end
  exportEdit:SetWidth(460)
  local _, fontHeight = exportEdit:GetFont()
  if not fontHeight or fontHeight < 1 then
    fontHeight = 14
  end
  local lines = exportEdit:GetNumLines()
  if lines < 1 then
    lines = 1
  end
  local h = math.max(80, lines * fontHeight + 24)
  exportEdit:SetHeight(h)
  exportScroll:UpdateScrollChildRect()
end

local function HideExportUI()
  if exportFrame then
    exportFrame:Hide()
  end
end

local function CreateExportUI()
  if exportFrame then
    return
  end

  local f = CreateFrame("Frame", "MyNextMountExportFrame", UIParent, "BackdropTemplate")
  f:SetSize(540, 320)
  f:SetPoint("CENTER", UIParent, "CENTER", 0, 0)
  f:SetFrameStrata("DIALOG")
  f:SetFrameLevel(200)
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
  title:SetText("MyNextMount")

  local help = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  help:SetPoint("TOP", title, "BOTTOM", 0, -10)
  help:SetWidth(500)
  help:SetJustifyH("CENTER")
  help:SetWordWrap(true)
  help:SetText(
    "Select all (|cffaaaaaaCtrl+A|r), copy (|cffaaaaaaCtrl+C|r) — window closes after copy — then paste on the website. "
      .. "|cffaaaaaaEsc|r or Close also dismisses."
  )

  local drag = CreateFrame("Button", nil, f)
  drag:SetPoint("TOPLEFT", f, "TOPLEFT", 0, 0)
  drag:SetPoint("TOPRIGHT", f, "TOPRIGHT", 0, 0)
  drag:SetHeight(88)
  drag:SetHighlightTexture("Interface\\QuestFrame\\UI-QuestTitleHighlight", "ADD")
  drag:RegisterForDrag("LeftButton")
  drag:SetScript("OnDragStart", function()
    f:StartMoving()
  end)
  drag:SetScript("OnDragStop", function()
    f:StopMovingOrSizing()
  end)

  local scroll = CreateFrame("ScrollFrame", "MyNextMountExportScroll", f, "UIPanelScrollFrameTemplate")
  scroll:SetPoint("TOPLEFT", f, "TOPLEFT", 16, -72)
  scroll:SetPoint("BOTTOMRIGHT", f, "BOTTOMRIGHT", -44, 48)

  local edit = CreateFrame("EditBox", "MyNextMountExportEdit", scroll)
  edit:SetMultiLine(true)
  edit:SetAutoFocus(false)
  edit:SetFontObject("ChatFontNormal")
  edit:SetWidth(460)
  edit:SetMaxLetters(999999)
  edit:SetTextInsets(6, 6, 6, 6)
  edit:SetScript("OnEscapePressed", HideExportUI)
  HookEditBoxCloseOnCtrlC(edit, HideExportUI)
  edit:SetScript("OnTextChanged", function(self, userInput)
    if userInput then
      return
    end
    UpdateExportEditHeight()
  end)

  scroll:SetScrollChild(edit)

  local closeBtn = CreateFrame("Button", nil, f, "UIPanelButtonTemplate")
  closeBtn:SetSize(120, 24)
  closeBtn:SetPoint("BOTTOM", f, "BOTTOM", 0, 16)
  closeBtn:SetText(CLOSE)
  closeBtn:SetScript("OnClick", HideExportUI)

  f:SetScript("OnHide", function()
    edit:ClearFocus()
  end)

  exportFrame = f
  exportScroll = scroll
  exportEdit = edit
  f:Hide()
end

local function ShowExportUI(text)
  CreateExportUI()
  exportEdit:SetText(text)
  exportEdit:SetCursorPosition(0)
  C_Timer.After(0, function()
    exportEdit:SetFocus()
    exportEdit:HighlightText()
    UpdateExportEditHeight()
    exportScroll:SetVerticalScroll(0)
  end)
  exportFrame:Show()
end

local function RunExport()
  local str, err, count = BuildExportString()
  if err then
    print("|cffff0000" .. ADDON_NAME .. ":|r " .. err)
    return
  end

  MyNextMountDB.lastExportTime = time()
  MyNextMountDB.lastExportCount = count

  print(
    "|cff00ccff"
      .. ADDON_NAME
      .. ":|r "
      .. count
      .. " collected mount spell IDs — export window opened."
  )

  if #str > 10000 then
    print(
      "|cffffcc00"
        .. ADDON_NAME
        .. ":|r Very long string; use the scroll bar in the window if needed."
    )
  end

  ShowExportUI(str)
end

local optionsRegistered = false

local function RegisterOptionsPanel()
  if optionsRegistered then
    return
  end

  if not Settings or not Settings.RegisterCanvasLayoutCategory then
    return
  end

  local canvas = CreateFrame("Frame", "MyNextMountSettingsCanvas", UIParent)
  canvas:Hide()
  canvas:SetSize(640, 520)

  local displayTitle = C_AddOns.GetAddOnMetadata(ADDON_NAME, "Title") or "MyNextMount"
  local title = canvas:CreateFontString(nil, "ARTWORK", "GameFontNormalHuge")
  title:SetPoint("TOPLEFT", 16, -20)
  title:SetText(displayTitle)

  local ver = C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "?"
  local sub = canvas:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
  sub:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -8)
  sub:SetText("Version " .. ver)

  local exportBtn = CreateFrame("Button", nil, canvas, "UIPanelButtonTemplate")
  exportBtn:SetSize(240, 28)
  exportBtn:SetPoint("TOPLEFT", sub, "BOTTOMLEFT", 0, -20)
  exportBtn:SetText("Open export for website")
  exportBtn:SetScript("OnClick", function()
    RunExport()
  end)

  local help = canvas:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
  help:SetPoint("TOPLEFT", exportBtn, "BOTTOMLEFT", 0, -20)
  help:SetWidth(600)
  help:SetJustifyH("LEFT")
  help:SetWordWrap(true)
  help:SetText(
    "|cffccccccHow to use|r\n"
      .. "• Click the button above or type |cffdddddd/mnm|r (|cffdddddd/mynextmount|r / |cffdddddd/mountexport|r).\n"
      .. "• In the export window: |cffddddddCtrl+A|r, then |cffddddddCtrl+C|r (window closes after copy).\n"
      .. "• Paste the line into |cffddddddmynextmount.com|r (or your dev URL).\n\n"
      .. "|cffccccccFormat|r: |cffddddddM:spellId,spellId,...|r (mount summon spell IDs). "
      .. "See |cffdddddddocs/export-contract.md|r in your project folder."
  )

  local urlHeader = canvas:CreateFontString(nil, "ARTWORK", "GameFontNormal")
  urlHeader:SetPoint("TOPLEFT", help, "BOTTOMLEFT", 0, -24)
  urlHeader:SetText("Website URL (optional)")

  local urlNote = canvas:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
  urlNote:SetPoint("TOPLEFT", urlHeader, "BOTTOMLEFT", 0, -8)
  urlNote:SetWidth(600)
  urlNote:SetJustifyH("LEFT")
  urlNote:SetWordWrap(true)
  urlNote:SetText(
    "Set once per account, e.g. |cffdddddd/run MyNextMountDB.websiteUrl=\"https://mynextmount.com\"|r "
      .. "or |cffdddddd\"http://localhost:3000\"|r for local dev. Then use the button below to open a copy dialog."
  )

  local urlBtn = CreateFrame("Button", nil, canvas, "UIPanelButtonTemplate")
  urlBtn:SetSize(200, 26)
  urlBtn:SetPoint("TOPLEFT", urlNote, "BOTTOMLEFT", 0, -12)
  urlBtn:SetText("Show website URL")
  urlBtn:SetScript("OnClick", function()
    local u = MyNextMountDB.websiteUrl
    if not u or u == "" then
      print(
        "|cffffcc00"
          .. ADDON_NAME
          .. ":|r Set URL first (|cffddddddmynextmount.com|r or |cffddddddlocalhost:3000|r for dev)."
      )
      return
    end
    pendingDocsUrl = u
    StaticPopup_Show("MYNEXTMOUNT_URL_COPY")
  end)

  local minimapShowCheck = CreateFrame("CheckButton", "MyNextMountMinimapShowCheck", canvas, "InterfaceOptionsCheckButtonTemplate")
  minimapShowCheck:SetPoint("TOPLEFT", urlBtn, "BOTTOMLEFT", 0, -28)
  minimapShowCheck.Text:SetText("Show minimap button")
  minimapShowCheck:SetChecked(not MyNextMountDB.minimapHidden)
  minimapShowCheck:SetScript("OnClick", function(self)
    MyNextMountDB.minimapHidden = not self:GetChecked()
    if ApplyMinimapVisibility then
      ApplyMinimapVisibility()
    end
  end)

  if MyNextMountGuideUI_OnOptionsCanvasReady then
    MyNextMountGuideUI_OnOptionsCanvasReady(canvas, minimapShowCheck)
  end

  canvas:SetScript("OnShow", function()
    minimapShowCheck:SetChecked(not MyNextMountDB.minimapHidden)
  end)

  local category = Settings.RegisterCanvasLayoutCategory(canvas, displayTitle)
  MNM_SettingsCategory = category
  category:SetOrder(500)
  if category.SetID then
    category:SetID(ADDON_NAME)
  end
  Settings.RegisterAddOnCategory(category)
  optionsRegistered = true
end

local minimapButton

local function OpenAddonSettings()
  RegisterOptionsPanel()
  if MNM_SettingsCategory and Settings and Settings.OpenToCategory then
    -- Defer so the click handler finishes before the UI opens (avoids stuck state).
    C_Timer.After(0, function()
      local sp = _G.SettingsPanel
      if type(sp) == "table" and sp.IsShown and not sp:IsShown() and ShowUIPanel then
        ShowUIPanel(sp)
      end
      Settings.OpenToCategory(MNM_SettingsCategory)
    end)
    return
  end
  print(
    "|cff00ccff"
      .. ADDON_NAME
      .. ":|r Press Esc → Options → AddOns → "
      .. ADDON_NAME
      .. "."
  )
end

--- Orbit angle (degrees): 0 = right of center, 90 = top; default ~lower-left rim.
local function GetMinimapButtonAngle()
  local v = MyNextMountDB.minimapAngle
  if type(v) == "number" then
    return v
  end
  return 200
end

local function PlaceMinimapButton(btn)
  if not btn or not Minimap then
    return
  end
  local mapW, mapH = Minimap:GetWidth(), Minimap:GetHeight()
  local radius = (math.min(mapW, mapH) / 2) + 3
  local a = math.rad(GetMinimapButtonAngle())
  local x, y = math.cos(a), math.sin(a)
  btn:ClearAllPoints()
  btn:SetPoint("CENTER", Minimap, "CENTER", -x * radius, y * radius)
end

local EnsureMinimapButton

ApplyMinimapVisibility = function()
  if not Minimap then
    return
  end
  EnsureMinimapButton()
  if not minimapButton then
    return
  end
  if MyNextMountDB.minimapHidden then
    minimapButton:Hide()
  else
    minimapButton:Show()
    PlaceMinimapButton(minimapButton)
  end
end

local minimapButtonOnUpdateFrame

-- Layout copied from LibDBIcon-1.0 (Blizzard minimap broker pattern): 31×31 hit box, 53×53 ring TOPLEFT-
-- anchored (not centered on a larger frame). UI-Minimap-Background + ARTWORK icon avoids mask bugs.
local MNM_MM_BTN_SIZE = 31
local MNM_MM_TRACK = 53
local MNM_MM_BG_SIZE = 20
local MNM_MM_BG_X, MNM_MM_BG_Y = 7, -5
local MNM_MM_ICON_SIZE = 17
local MNM_MM_ICON_X, MNM_MM_ICON_Y = 7, -6

EnsureMinimapButton = function()
  if minimapButton then
    return
  end
  if not Minimap then
    return
  end
  local btn = CreateFrame("Button", "MyNextMountMinimapButton", Minimap)
  minimapButton = btn
  btn:SetSize(MNM_MM_BTN_SIZE, MNM_MM_BTN_SIZE)
  btn:SetFrameStrata("MEDIUM")
  btn:SetFrameLevel(8)
  btn:EnableMouse(true)
  if btn.EnableMouseMotion then
    btn:EnableMouseMotion(true)
  end
  btn:RegisterForDrag("LeftButton")
  btn:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight", "ADD")
  local hl = btn:GetHighlightTexture()
  if hl then
    hl:SetBlendMode("ADD")
    hl:SetSize(MNM_MM_TRACK, MNM_MM_TRACK)
    hl:SetPoint("TOPLEFT", 0, 0)
  end
  PlaceMinimapButton(btn)

  local track = btn:CreateTexture(nil, "OVERLAY")
  track:SetSize(MNM_MM_TRACK, MNM_MM_TRACK)
  track:SetTexture("Interface\\Minimap\\MiniMap-TrackingBorder")
  track:SetPoint("TOPLEFT", btn, "TOPLEFT", 0, 0)

  local bg = btn:CreateTexture(nil, "BACKGROUND")
  bg:SetSize(MNM_MM_BG_SIZE, MNM_MM_BG_SIZE)
  bg:SetTexture("Interface\\Minimap\\UI-Minimap-Background")
  bg:SetPoint("TOPLEFT", btn, "TOPLEFT", MNM_MM_BG_X, MNM_MM_BG_Y)

  local icon = btn:CreateTexture(nil, "ARTWORK")
  icon:SetSize(MNM_MM_ICON_SIZE, MNM_MM_ICON_SIZE)
  icon:SetPoint("TOPLEFT", btn, "TOPLEFT", MNM_MM_ICON_X, MNM_MM_ICON_Y)
  icon:SetTexture("Interface\\AddOns\\MyNextMount\\Media\\mynextmount-icon.png")
  icon:SetTexCoord(0.12, 0.88, 0.12, 0.88)

  local function minimapDragOnUpdate(self)
    local mx, my = Minimap:GetCenter()
    local px, py = GetCursorPosition()
    local scale = Minimap:GetEffectiveScale()
    px, py = px / scale, py / scale
    MyNextMountDB.minimapAngle = math.deg(math.atan2(py - my, -(px - mx)))
    PlaceMinimapButton(self)
    self._mnmDragMoved = true
  end

  btn:SetScript("OnDragStart", function(self)
    self._mnmDragMoved = false
    self:SetScript("OnUpdate", minimapDragOnUpdate)
  end)
  btn:SetScript("OnDragStop", function(self)
    self:SetScript("OnUpdate", nil)
    if self._mnmDragMoved then
      self._mnmSuppressLeftClick = true
    end
  end)

  -- OnMouseUp: reliable over the minimap on 12.x; avoid duplicating with OnClick (would double-fire).
  btn:SetScript("OnMouseUp", function(self, button)
    if button == "RightButton" then
      if IsShiftKeyDown() then
        MyNextMountDB.minimapHidden = true
        ApplyMinimapVisibility()
        local cb = _G.MyNextMountMinimapShowCheck
        if cb and cb.SetChecked then
          cb:SetChecked(false)
        end
        return
      end
      OpenAddonSettings()
      return
    end
    if button ~= "LeftButton" then
      return
    end
    if self._mnmSuppressLeftClick then
      self._mnmSuppressLeftClick = false
      return
    end
    RunExport()
  end)

  btn:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_LEFT")
    GameTooltip:SetText(ADDON_NAME, 1, 1, 1)
    GameTooltip:AddLine(
      "Left-click: export for mynextmount.com (same as /mnm)",
      0.85,
      0.85,
      1,
      true
    )
    GameTooltip:AddLine(
      "Drag: move around minimap edge",
      0.85,
      0.85,
      1,
      true
    )
    GameTooltip:AddLine(
      "Right-click: addon options",
      0.85,
      0.85,
      1,
      true
    )
    GameTooltip:AddLine(
      "Shift+right-click: hide minimap button (re-enable in addon options)",
      0.85,
      0.85,
      1,
      true
    )
    GameTooltip:Show()
  end)
  btn:SetScript("OnLeave", GameTooltip_Hide)

  -- Reposition when the minimap layout or zoom changes (stay on the rim like other buttons).
  if not minimapButtonOnUpdateFrame then
    minimapButtonOnUpdateFrame = CreateFrame("Frame")
    minimapButtonOnUpdateFrame:RegisterEvent("MINIMAP_UPDATE_ZOOM")
    minimapButtonOnUpdateFrame:SetScript("OnEvent", function()
      if minimapButton and minimapButton:IsShown() then
        PlaceMinimapButton(minimapButton)
      end
    end)
    if not Minimap._MyNextMountSizeHook then
      Minimap._MyNextMountSizeHook = true
      Minimap:HookScript("OnSizeChanged", function()
        if minimapButton and minimapButton:IsShown() then
          PlaceMinimapButton(minimapButton)
        end
      end)
    end
  end
end

local function MigrateLegacySavedVariables()
  local leg = _G.MountFarmExportDB
  if type(leg) ~= "table" then
    return
  end
  if leg.websiteUrl and leg.websiteUrl ~= "" and (not MyNextMountDB.websiteUrl or MyNextMountDB.websiteUrl == "") then
    MyNextMountDB.websiteUrl = leg.websiteUrl
  end
  if type(leg.guideChecks) == "table" then
    MyNextMountDB.guideChecks = MyNextMountDB.guideChecks or {}
    for sid, steps in pairs(leg.guideChecks) do
      MyNextMountDB.guideChecks[sid] = MyNextMountDB.guideChecks[sid] or {}
      for idx, v in pairs(steps) do
        if v and not MyNextMountDB.guideChecks[sid][idx] then
          MyNextMountDB.guideChecks[sid][idx] = v
        end
      end
    end
  end
  if leg.lastExportTime and not MyNextMountDB.lastExportTime then
    MyNextMountDB.lastExportTime = leg.lastExportTime
  end
  if leg.lastExportCount and not MyNextMountDB.lastExportCount then
    MyNextMountDB.lastExportCount = leg.lastExportCount
  end
  if next(leg) ~= nil then
    MountFarmExportDB = nil
  end
end

local loadFrame = CreateFrame("Frame")
loadFrame:RegisterEvent("ADDON_LOADED")
loadFrame:SetScript("OnEvent", function(_, _, name)
  if name == ADDON_NAME then
    MigrateLegacySavedVariables()
    RegisterOptionsPanel()
    ApplyMinimapVisibility()
  end
end)

SLASH_MYNEXTMOUNT1 = "/mountexport"
SLASH_MYNEXTMOUNT2 = "/mynextmount"
SLASH_MYNEXTMOUNT3 = "/mnm"
SlashCmdList["MYNEXTMOUNT"] = function()
  RunExport()
end
