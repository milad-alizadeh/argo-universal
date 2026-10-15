package dev.argo.client

import android.graphics.Color
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.OptimizedRecord

@OptimizedRecord
data class ThemeColors(
  @Field val accent: Color? = null,
  @Field val foreground: Color? = null,
  @Field val primaryForeground: Color? = null,
  @Field val card: Color? = null,
  @Field val content: Color? = null,
  @Field val muted: Color? = null,
  @Field val mutedForeground: Color? = null,
  @Field val border: Color? = null,
  @Field val danger: Color? = null
) : Record
