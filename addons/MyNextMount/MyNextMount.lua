--[[
  MyNextMount — paste string into mynextmount.com (or your dev URL).
  Format v1: docs/export-contract.md
  Slash: /mountexport or /mynextmount
  Options: Esc → Options → AddOns → MyNextMount
]]

local ADDON_NAME = "MyNextMount"

MyNextMountDB = MyNextMountDB or {}
MyNextMountDB.websiteUrl = MyNextMountDB.websiteUrl or ""

local pendingDocsUrl = ""

StaticPopupDialogs["MYNEXTMOUNT_URL_COPY"] = {
  text = "Website URL (|cffaaaaaaCtrl+C|r to copy):",
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
    "Select all (|cffaaaaaaCtrl+A|r), copy (|cffaaaaaaCtrl+C|r), paste on the website. "
      .. "|cffaaaaaaEsc|r or Close to dismiss."
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
  optionsRegistered = true

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
      .. "• Click the button above or type |cffdddddd/mountexport|r (|cffdddddd/mynextmount|r).\n"
      .. "• In the export window: |cffddddddCtrl+A|r, then |cffddddddCtrl+C|r.\n"
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

  if MyNextMountGuideUI_OnOptionsCanvasReady then
    MyNextMountGuideUI_OnOptionsCanvasReady(canvas, urlBtn)
  end

  local category = Settings.RegisterCanvasLayoutCategory(canvas, displayTitle)
  category:SetOrder(500)
  if category.SetID then
    category:SetID(ADDON_NAME)
  end
  Settings.RegisterAddOnCategory(category)
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
  end
end)

SLASH_MYNEXTMOUNT1 = "/mountexport"
SLASH_MYNEXTMOUNT2 = "/mynextmount"
SlashCmdList["MYNEXTMOUNT"] = function()
  RunExport()
end
