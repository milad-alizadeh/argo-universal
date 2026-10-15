package dev.argo.client

import androidx.compose.material3.ColorScheme
import expo.modules.ui.composeOrNull

fun argoColorScheme(base: ColorScheme, colors: ThemeColors): ColorScheme = base.copy(
  primary = colors.accent.composeOrNull ?: base.primary,
  onPrimary = colors.primaryForeground.composeOrNull ?: base.onPrimary,
  primaryContainer = colors.muted.composeOrNull ?: base.primaryContainer,
  onPrimaryContainer = colors.foreground.composeOrNull ?: base.onPrimaryContainer,
  inversePrimary = colors.card.composeOrNull ?: base.inversePrimary,
  secondary = colors.accent.composeOrNull ?: base.secondary,
  onSecondary = colors.primaryForeground.composeOrNull ?: base.onSecondary,
  secondaryContainer = colors.muted.composeOrNull ?: base.secondaryContainer,
  onSecondaryContainer = colors.foreground.composeOrNull ?: base.onSecondaryContainer,
  tertiary = colors.accent.composeOrNull ?: base.tertiary,
  onTertiary = colors.primaryForeground.composeOrNull ?: base.onTertiary,
  tertiaryContainer = colors.muted.composeOrNull ?: base.tertiaryContainer,
  onTertiaryContainer = colors.foreground.composeOrNull ?: base.onTertiaryContainer,
  background = colors.content.composeOrNull ?: base.background,
  onBackground = colors.foreground.composeOrNull ?: base.onBackground,
  surface = colors.card.composeOrNull ?: base.surface,
  onSurface = colors.foreground.composeOrNull ?: base.onSurface,
  surfaceVariant = colors.muted.composeOrNull ?: base.surfaceVariant,
  onSurfaceVariant = colors.mutedForeground.composeOrNull ?: base.onSurfaceVariant,
  surfaceTint = colors.accent.composeOrNull ?: base.surfaceTint,
  inverseSurface = colors.foreground.composeOrNull ?: base.inverseSurface,
  inverseOnSurface = colors.card.composeOrNull ?: base.inverseOnSurface,
  error = colors.danger.composeOrNull ?: base.error,
  onError = colors.primaryForeground.composeOrNull ?: base.onError,
  errorContainer = colors.muted.composeOrNull ?: base.errorContainer,
  onErrorContainer = colors.danger.composeOrNull ?: base.onErrorContainer,
  outline = colors.border.composeOrNull ?: base.outline,
  outlineVariant = colors.border.composeOrNull ?: base.outlineVariant,
  surfaceBright = colors.card.composeOrNull ?: base.surfaceBright,
  surfaceDim = colors.content.composeOrNull ?: base.surfaceDim,
  surfaceContainer = colors.card.composeOrNull ?: base.surfaceContainer,
  surfaceContainerHigh = colors.muted.composeOrNull ?: base.surfaceContainerHigh,
  surfaceContainerHighest = colors.muted.composeOrNull ?: base.surfaceContainerHighest,
  surfaceContainerLow = colors.content.composeOrNull ?: base.surfaceContainerLow,
  surfaceContainerLowest = colors.content.composeOrNull ?: base.surfaceContainerLowest
)
