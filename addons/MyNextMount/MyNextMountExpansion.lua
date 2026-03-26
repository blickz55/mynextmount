--[[
  Expansion era filter for export + farm guides (matches website Era focus).
  Data: MyNextMountExpansionData.lua (npm run addon:sync-expansion).
  Saved: MyNextMountDB.expansionFocus (string id, default all).
]]

local OPTIONS = {
  { id = "all", label = "All eras" },
  { id = "classic", label = "Classic / Vanilla" },
  { id = "tbc", label = "The Burning Crusade" },
  { id = "wrath", label = "Wrath of the Lich King" },
  { id = "cata", label = "Cataclysm" },
  { id = "mop", label = "Mists of Pandaria" },
  { id = "wod", label = "Warlords of Draenor" },
  { id = "legion", label = "Legion" },
  { id = "bfa", label = "Battle for Azeroth" },
  { id = "shadowlands", label = "Shadowlands" },
  { id = "dragonflight", label = "Dragonflight" },
  { id = "the_war_within", label = "The War Within" },
  { id = "unknown", label = "Unknown era" },
}

local function isValidFocusId(id)
  if type(id) ~= "string" then
    return false
  end
  for _, o in ipairs(OPTIONS) do
    if o.id == id then
      return true
    end
  end
  return false
end

function MyNextMountExpansion_GetFocus()
  local db = MyNextMountDB
  local id = db and db.expansionFocus
  if isValidFocusId(id) then
    return id
  end
  return "all"
end

function MyNextMountExpansion_SetFocus(id)
  if not isValidFocusId(id) then
    return
  end
  MyNextMountDB = MyNextMountDB or {}
  MyNextMountDB.expansionFocus = id
end

function MyNextMountExpansion_LabelForId(id)
  for _, o in ipairs(OPTIONS) do
    if o.id == id then
      return o.label
    end
  end
  return tostring(id)
end

function MyNextMountExpansion_FocusIndex()
  local f = MyNextMountExpansion_GetFocus()
  for i, o in ipairs(OPTIONS) do
    if o.id == f then
      return i
    end
  end
  return 1
end

function MyNextMountExpansion_CycleFocus(delta)
  local n = #OPTIONS
  local i = MyNextMountExpansion_FocusIndex() + delta
  while i < 1 do
    i = i + n
  end
  while i > n do
    i = i - n
  end
  MyNextMountExpansion_SetFocus(OPTIONS[i].id)
  return OPTIONS[i]
end

function MyNextMountExpansion_SpellMatches(spellId, focusId)
  if focusId == "all" then
    return true
  end
  local map = MyNextMountExpansionData and MyNextMountExpansionData.bySpellId
  local bucket = (map and map[spellId]) or "unknown"
  return bucket == focusId
end
