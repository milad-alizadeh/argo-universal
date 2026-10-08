# Dependency declarations

## react-native@0.86.3

`react-native@0.86.3.patch` adds `blockquote` and `code` to the two published `Role` declarations. React Native Web already maps these roles to their semantic HTML elements. Argo selects them only on web; native roles and all dependency runtime files stay unchanged.

Remove this patch when the pinned React Native declarations include both roles. When upgrading React Native, check both declaration entry points before carrying the patch forward.
