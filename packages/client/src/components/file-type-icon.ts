import type { Icon } from 'phosphor-react-native';
import { FileIcon } from 'phosphor-react-native/src/icons/File';
import { FileCIcon } from 'phosphor-react-native/src/icons/FileC';
import { FileCppIcon } from 'phosphor-react-native/src/icons/FileCpp';
import { FileCSharpIcon } from 'phosphor-react-native/src/icons/FileCSharp';
import { FileCssIcon } from 'phosphor-react-native/src/icons/FileCss';
import { FileCsvIcon } from 'phosphor-react-native/src/icons/FileCsv';
import { FileDocIcon } from 'phosphor-react-native/src/icons/FileDoc';
import { FileHtmlIcon } from 'phosphor-react-native/src/icons/FileHtml';
import { FileIniIcon } from 'phosphor-react-native/src/icons/FileIni';
import { FileJpgIcon } from 'phosphor-react-native/src/icons/FileJpg';
import { FileJsIcon } from 'phosphor-react-native/src/icons/FileJs';
import { FileJsxIcon } from 'phosphor-react-native/src/icons/FileJsx';
import { FileMdIcon } from 'phosphor-react-native/src/icons/FileMd';
import { FilePdfIcon } from 'phosphor-react-native/src/icons/FilePdf';
import { FilePngIcon } from 'phosphor-react-native/src/icons/FilePng';
import { FilePptIcon } from 'phosphor-react-native/src/icons/FilePpt';
import { FilePyIcon } from 'phosphor-react-native/src/icons/FilePy';
import { FileRsIcon } from 'phosphor-react-native/src/icons/FileRs';
import { FileSqlIcon } from 'phosphor-react-native/src/icons/FileSql';
import { FileSvgIcon } from 'phosphor-react-native/src/icons/FileSvg';
import { FileTsIcon } from 'phosphor-react-native/src/icons/FileTs';
import { FileTsxIcon } from 'phosphor-react-native/src/icons/FileTsx';
import { FileTxtIcon } from 'phosphor-react-native/src/icons/FileTxt';
import { FileVueIcon } from 'phosphor-react-native/src/icons/FileVue';
import { FileXlsIcon } from 'phosphor-react-native/src/icons/FileXls';
import { FileZipIcon } from 'phosphor-react-native/src/icons/FileZip';

const fileIcons: Record<string, Icon> = {
  c: FileCIcon,
  cpp: FileCppIcon,
  cs: FileCSharpIcon,
  css: FileCssIcon,
  csv: FileCsvIcon,
  doc: FileDocIcon,
  docx: FileDocIcon,
  html: FileHtmlIcon,
  htm: FileHtmlIcon,
  ini: FileIniIcon,
  jpg: FileJpgIcon,
  jpeg: FileJpgIcon,
  js: FileJsIcon,
  jsx: FileJsxIcon,
  md: FileMdIcon,
  markdown: FileMdIcon,
  pdf: FilePdfIcon,
  png: FilePngIcon,
  ppt: FilePptIcon,
  pptx: FilePptIcon,
  py: FilePyIcon,
  rs: FileRsIcon,
  sql: FileSqlIcon,
  svg: FileSvgIcon,
  ts: FileTsIcon,
  tsx: FileTsxIcon,
  txt: FileTxtIcon,
  vue: FileVueIcon,
  xls: FileXlsIcon,
  xlsx: FileXlsIcon,
  zip: FileZipIcon,
};

export function fileTypeIcon(path: string): Icon {
  const filename = path.split('/').at(-1) ?? '';
  const dot = filename.lastIndexOf('.');
  const extension = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
  return fileIcons[extension] ?? FileIcon;
}
