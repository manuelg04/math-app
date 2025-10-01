export interface AcademicProgram {
  value: string;
  label: string;
}

export interface Faculty {
  name: string;
  programs: AcademicProgram[];
}

export const academicPrograms: Faculty[] = [
  {
    name: "Facultad de Ciencias Agropecuarias",
    programs: [
      { value: "administracion-agronegocios", label: "ADMINISTRACION AGRONEGOCIOS" },
      { value: "medicina-veterinaria", label: "MEDICINA VETERINARIA" },
      { value: "tecnologia-en-enfermeria-veterinaria", label: "TECNOLOGÍA EN ENFERMERÍA VETERINARIA" },
      { value: "zootecnia", label: "ZOOTECNIA" },
    ],
  },
  {
    name: "Facultad de Economía, Empresa y Desarrollo Sostenible - FEEDS",
    programs: [
      { value: "administracion-de-empresas", label: "ADMINISTRACION DE EMPRESAS" },
      { value: "administracion-de-empresas-virtual", label: "ADMINISTRACION DE EMPRESAS VIRTUAL" },
      { value: "contaduria-publica", label: "CONTADURIA PUBLICA" },
      { value: "contaduria-publica-virtual", label: "CONTADURIA PUBLICA VIRTUAL" },
      { value: "economia", label: "ECONOMIA" },
      { value: "finanzas-y-comercio-internacional", label: "FINANZAS Y COMERCIO INTERNACIONAL" },
      { value: "finanzas-y-comercio-internacional-virtual", label: "FINANZAS Y COMERCIO INTERNACIONAL VIRTUAL" },
      { value: "gobiernos-y-asuntos-publicos", label: "GOBIERNOS Y ASUNTOS PUBLICOS" },
      { value: "negocios-y-relaciones-internacionales", label: "NEGOCIOS Y RELACIONES INTERNACIONALES" },
      { value: "negocios-y-relaciones-internacionales-virtual", label: "NEGOCIOS Y RELACIONES INTERNACIONALES VIRTUAL" },
      { value: "tecnico-profesional-en-contabilidad-y-finanzas", label: "TÉCNICO PROFESIONAL EN CONTABILIDAD Y FINANZAS" },
      { value: "tecnologia-en-gestion-contable-y-financiera", label: "TECNOLOGÍA  EN GESTIÓN CONTABLE Y FINANCIERA" },
      { value: "tecnologia-en-gestion-de-negocios-digitales", label: "TECNOLOGIA EN GESTION DE NEGOCIOS DIGITALES" },
      { value: "tnlgo-en-desarrollo-soft-para-neg-dig", label: "TNLGO EN DESARROLLO SOFT PARA NEG DIG" },
    ],
  },
  {
    name: "Escuela de Humanidades y Estudios Sociales",
    programs: [
      { value: "archivistica-e-inteligencia-de-negocios", label: "ARCHIVISTICA E INTELIGENCIA DE NEGOCIOS" },
      { value: "bibliotecologia-y-estudios-de-la-informacion", label: "BIBLIOTECOLOGIA Y ESTUDIOS DE LA INFORMACION" },
      { value: "derecho", label: "DERECHO" },
      { value: "filosofia-y-letras", label: "FILOSOFIA Y LETRAS" },
      { value: "trabajo-social-virtual", label: "TRABAJO SOCIAL VIRTUAL" },
    ],
  },
  {
    name: "Facultad de Arquitectura Diseño y Urbanismo",
    programs: [
      { value: "arquitectura", label: "ARQUITECTURA" },
      { value: "diseño-industrial", label: "DISEÑO INDUSTRIAL" },
      { value: "diseño-visual", label: "DISEÑO VISUAL" },
      { value: "tecnologia-en-construccion-de-la-edificacion", label: "TECNOLOGIA EN CONSTRUCCION DE LA EDIFICACION" },
      { value: "urbanismo", label: "URBANISMO" },
    ],
  },
  {
    name: "Facultad de Ingeniería",
    programs: [
      { value: "bioingenieria", label: "BIOINGENIERIA" },
      { value: "ingenieria-ambiental-y-sanitaria", label: "INGENIERIA AMBIENTAL Y SANITARIA" },
      { value: "ingenieria-civil", label: "INGENIERIA CIVIL" },
      { value: "ingenieria-de-alimentos", label: "INGENIERIA DE ALIMENTOS" },
      { value: "ingenieria-de-software-presencial", label: "INGENIERIA DE SOFTWARE PRESENCIAL" },
      { value: "ingenieria-de-software-virtual", label: "INGENIERIA DE SOFTWARE VIRTUAL" },
      { value: "ingenieria-electrica", label: "INGENIERIA ELECTRICA" },
      { value: "ingenieria-industrial", label: "INGENIERIA INDUSTRIAL" },
      { value: "ingenieria-mecatronica", label: "INGENIERIA MECATRONICA" },
      { value: "ingenieria-quimica", label: "INGENIERIA QUIMICA" },
    ],
  },
  {
    name: "Escuela de Ciencias Básicas y Aplicadas",
    programs: [
      { value: "biologia", label: "BIOLOGIA" },
      { value: "ciencia-de-datos", label: "CIENCIA DE DATOS" },
      { value: "quimica-farmaceutica", label: "QUIMICA FARMACEUTICA" },
    ],
  },
  {
    name: "Facultad Ciencias de la Educación",
    programs: [
      { value: "lic-en-educ-fisica-recreacion-y-deport", label: "LIC EN EDUC FISICA,RECREACIÓN Y DEPORT" },
      { value: "licenciatura-en-ciencias-naturales-y-educacion-ambiental", label: "LICENCIATURA EN CIENCIAS NATURALES Y EDUCACION AMBIENTAL" },
      { value: "licenciatura-en-ciencias-sociales-con-enfasis-en-historia", label: "LICENCIATURA EN CIENCIAS SOCIALES CON ÉNFASIS EN HISTORIA" },
      { value: "licenciatura-en-educacion-basica-primaria", label: "LICENCIATURA EN EDUCACION BASICA PRIMARIA" },
      { value: "licenciatura-en-educacion-religiosa", label: "LICENCIATURA EN EDUCACION RELIGIOSA" },
      { value: "licenciatura-en-educacion-religiosa-virtual", label: "LICENCIATURA EN EDUCACION RELIGIOSA VIRTUAL" },
      { value: "licenciatura-en-español-y-lenguas-extranjeras", label: "LICENCIATURA EN ESPAÑOL Y LENGUAS EXTRANJERAS" },
      { value: "licenciatura-en-literatura-y-lengua-castellana", label: "LICENCIATURA EN LITERATURA Y LENGUA CASTELLANA" },
    ],
  },
  {
    name: "Facultad Ciencias de la Salud",
    programs: [
      { value: "optometria", label: "OPTOMETRIA" },
    ],
  },
];
